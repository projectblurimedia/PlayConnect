import prisma from '../lib/prisma.js'
import { computeCricketCareerStats } from '../utils/cricketStats.js'

export const getNearbyPlayers = async (req, res) => {
  try {
    const { city, state, sport, limit = 20 } = req.query
    const where = { isActive: true, id: { not: req.user.id } }
    if (city) where.city = { contains: city, mode: 'insensitive' }
    else if (state) where.state = { contains: state, mode: 'insensitive' }
    if (sport) where.sports = { some: { sport } }

    const players = await prisma.user.findMany({
      where,
      take: parseInt(limit),
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true, fullName: true, username: true, city: true, state: true,
        profilePhotoUrl: true, bio: true,
        sports: { select: { sport: true, skillLevel: true, preferredRole: true } },
      },
    })
    res.json({ success: true, players })
  } catch (error) {
    console.error('getNearbyPlayers error:', error)
    res.status(500).json({ error: 'Failed to fetch players' })
  }
}

export const getPlayerProfile = async (req, res) => {
  try {
    const { id } = req.params
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, fullName: true, username: true, city: true, state: true, bio: true,
        profilePhotoUrl: true,
        sports: { select: { sport: true, skillLevel: true, preferredRole: true, matchesPlayed: true, matchesWon: true, rating: true, stats: true } },
        createdAt: true,
      },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Stats are recomputed live from completed matches so they're always accurate,
    // even for matches played before UserSport.stats tracked this breakdown.
    const cricketSport = user.sports.find(s => s.sport === 'CRICKET')
    if (cricketSport) {
      const career = await computeCricketCareerStats(id)
      cricketSport.matchesPlayed = career.matchesPlayed
      cricketSport.matchesWon = career.matchesWon
      cricketSport.stats = career.stats
    }

    res.json({ success: true, user })
  } catch (error) {
    console.error('getPlayerProfile error:', error)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
}
