import prisma from '../lib/prisma.js'
import { randomBytes } from 'crypto'

function generateInviteCode() {
  return randomBytes(4).toString('hex').toUpperCase().slice(0, 6)
}

// POST /api/teams — create team, creator becomes ADMIN
export const createTeam = async (req, res) => {
  const { name, description, sport = 'CRICKET', maxPlayers = 11 } = req.body
  const userId = req.user.id

  if (!name?.trim()) return res.status(400).json({ error: 'Team name is required' })
  if (maxPlayers < 2 || maxPlayers > 15)
    return res.status(400).json({ error: 'maxPlayers must be between 2 and 15' })

  let inviteCode
  let attempts = 0
  while (attempts < 10) {
    const code = generateInviteCode()
    const existing = await prisma.team.findUnique({ where: { inviteCode: code } })
    if (!existing) { inviteCode = code; break }
    attempts++
  }
  if (!inviteCode) return res.status(500).json({ error: 'Could not generate unique code, try again' })

  const team = await prisma.team.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      sport,
      maxPlayers,
      inviteCode,
      createdBy: userId,
      members: {
        create: { userId, role: 'ADMIN' },
      },
    },
    include: { members: { include: { user: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } } } } },
  })

  res.status(201).json({ success: true, team })
}

// POST /api/teams/join — join via invite code
export const joinTeam = async (req, res) => {
  const { inviteCode } = req.body
  const userId = req.user.id

  if (!inviteCode?.trim()) return res.status(400).json({ error: 'Invite code is required' })

  const team = await prisma.team.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
    include: { members: true },
  })

  if (!team) return res.status(404).json({ error: 'Invalid invite code' })

  const alreadyMember = team.members.some(m => m.userId === userId)
  if (alreadyMember) return res.status(400).json({ error: 'You are already in this team' })

  if (team.members.length >= team.maxPlayers)
    return res.status(400).json({ error: `Team is full (max ${team.maxPlayers} players)` })

  const membership = await prisma.teamMember.create({
    data: { teamId: team.id, userId, role: 'PLAYER' },
    include: { user: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } } },
  })

  res.json({ success: true, team: { id: team.id, name: team.name, sport: team.sport }, membership })
}

// GET /api/teams — all teams the user belongs to
export const getMyTeams = async (req, res) => {
  const userId = req.user.id

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          members: {
            include: {
              user: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  const teams = memberships.map(m => ({ ...m.team, myRole: m.role }))
  res.json({ success: true, teams })
}

// GET /api/teams/search?q=name — public team search
export const searchTeams = async (req, res) => {
  const { q } = req.query
  if (!q?.trim() || q.trim().length < 2) return res.json({ success: true, teams: [] })

  const teams = await prisma.team.findMany({
    where: { name: { contains: q.trim(), mode: 'insensitive' } },
    include: {
      members: {
        select: {
          userId: true, role: true,
          user: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } },
        },
      },
    },
    take: 20,
  })

  // Never expose invite codes in public search
  const publicTeams = teams.map(({ inviteCode: _ic, ...t }) => t)
  res.json({ success: true, teams: publicTeams })
}

// GET /api/teams/:teamId — team detail (members can see invite code; non-members see public view)
export const getTeamDetail = async (req, res) => {
  const userId = req.user.id
  const { teamId } = req.params

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: {
          user: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true, city: true } },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })

  if (!team) return res.status(404).json({ error: 'Team not found' })

  const myMembership = team.members.find(m => m.userId === userId)
  const isMember = !!myMembership

  if (!isMember) {
    // Public view — strip invite code
    const { inviteCode: _ic, ...publicTeam } = team
    return res.json({ success: true, team: publicTeam, isMember: false, myRole: null })
  }

  res.json({ success: true, team, isMember: true, myRole: myMembership.role })
}

// PUT /api/teams/:teamId/assign-role — admin assigns role (admin = team creator)
export const assignRole = async (req, res) => {
  const adminId = req.user.id
  const { teamId } = req.params
  const { userId, role } = req.body

  const validRoles = ['CAPTAIN', 'VICE_CAPTAIN', 'WICKET_KEEPER', 'PLAYER']
  if (!validRoles.includes(role))
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` })

  // Admin = team creator (not role field — creator can hold a cricket role too)
  const teamData = await prisma.team.findUnique({ where: { id: teamId }, select: { createdBy: true } })
  if (!teamData || teamData.createdBy !== adminId)
    return res.status(403).json({ error: 'Only team admin can assign roles' })

  const targetMember = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } })
  if (!targetMember) return res.status(404).json({ error: 'User is not a member of this team' })

  // Clear previous holder for unique cricket roles
  const uniqueRoles = ['CAPTAIN', 'VICE_CAPTAIN', 'WICKET_KEEPER']
  if (uniqueRoles.includes(role)) {
    await prisma.teamMember.updateMany({
      where: { teamId, role, userId: { not: userId } },
      data: { role: 'PLAYER' },
    })
  }

  const updated = await prisma.teamMember.update({
    where: { teamId_userId: { teamId, userId } },
    data: { role },
    include: { user: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } } },
  })

  res.json({ success: true, member: updated })
}

// DELETE /api/teams/:teamId/members/:userId — admin removes member
export const removeMember = async (req, res) => {
  const adminId = req.user.id
  const { teamId, userId } = req.params

  const teamData = await prisma.team.findUnique({ where: { id: teamId }, select: { createdBy: true } })
  if (!teamData || teamData.createdBy !== adminId)
    return res.status(403).json({ error: 'Only team admin can remove members' })

  if (userId === adminId)
    return res.status(400).json({ error: 'Admin cannot remove themselves.' })

  const target = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } })
  if (!target) return res.status(404).json({ error: 'User is not in this team' })

  await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } })
  res.json({ success: true, message: 'Member removed' })
}

// POST /api/teams/:teamId/leave — member leaves team
export const leaveTeam = async (req, res) => {
  const userId = req.user.id
  const { teamId } = req.params

  const membership = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } })
  if (!membership) return res.status(404).json({ error: 'You are not in this team' })

  const teamData = await prisma.team.findUnique({ where: { id: teamId }, select: { createdBy: true } })
  const isCreator = teamData?.createdBy === userId

  if (isCreator) {
    const otherCount = await prisma.teamMember.count({ where: { teamId, userId: { not: userId } } })
    if (otherCount > 0)
      return res.status(400).json({ error: 'You are the admin. Delete the team to remove it for everyone.' })
    await prisma.team.delete({ where: { id: teamId } })
    return res.json({ success: true, message: 'Team deleted as you were the last member' })
  }

  await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } })
  res.json({ success: true, message: 'Left team successfully' })
}

// DELETE /api/teams/:teamId — admin deletes entire team
export const deleteTeam = async (req, res) => {
  const adminId = req.user.id
  const { teamId } = req.params

  const teamData = await prisma.team.findUnique({ where: { id: teamId }, select: { createdBy: true } })
  if (!teamData || teamData.createdBy !== adminId)
    return res.status(403).json({ error: 'Only team admin can delete the team' })

  await prisma.team.delete({ where: { id: teamId } })
  res.json({ success: true, message: 'Team deleted' })
}
