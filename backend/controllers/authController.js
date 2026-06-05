import prisma from '../lib/prisma.js'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'

const genderMap = { Male: 'MALE', Female: 'FEMALE', Other: 'OTHER' }
const skillMap = { Beginner: 'BEGINNER', Intermediate: 'INTERMEDIATE', Advanced: 'ADVANCED', Professional: 'ADVANCED' }
const sportEnumMap = {
  CRICKET: 'CRICKET', FOOTBALL: 'FOOTBALL', BADMINTON: 'BADMINTON',
  BASKETBALL: 'BASKETBALL', VOLLEYBALL: 'VOLLEYBALL', KABADDI: 'KABADDI',
  TENNIS: 'TENNIS', TABLE_TENNIS: 'OTHER', HOCKEY: 'OTHER',
  RUNNING: 'OTHER', CYCLING: 'OTHER', SWIMMING: 'OTHER',
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

export const checkUsername = async (req, res) => {
  const { username } = req.query
  if (!username || username.trim().length < 3) {
    return res.json({ available: false, message: 'Username must be at least 3 characters' })
  }
  try {
    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
      select: { id: true },
    })
    res.json({ available: !existing })
  } catch (error) {
    console.error('checkUsername error:', error)
    res.status(500).json({ available: false, message: 'Server error' })
  }
}

export const register = async (req, res) => {
  try {
    const {
      fullName, username, phone, password, dob, gender,
      country, state, city, area, pincode,
      latitude, longitude, profilePhotoUrl, sports,
    } = req.body

    if (!fullName?.trim() || !username?.trim() || !phone?.trim() || !dob || !gender || !country || !state || !city || !pincode) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const [existingUsername, existingPhone] = await Promise.all([
      prisma.user.findUnique({ where: { username: username.trim() }, select: { id: true } }),
      prisma.user.findUnique({ where: { phone: phone.trim() }, select: { id: true } }),
    ])
    if (existingUsername) return res.status(409).json({ error: 'Username already taken' })
    if (existingPhone) return res.status(409).json({ error: 'Phone number already registered' })

    const passwordHash = password ? await bcryptjs.hash(password, 10) : null

    const seenSports = new Set()
    const dedupedSports = (sports || []).filter(s => {
      const enumVal = sportEnumMap[s.sport] ?? 'OTHER'
      if (seenSports.has(enumVal)) return false
      seenSports.add(enumVal)
      return true
    })

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        username: username.trim(),
        phone: phone.trim(),
        passwordHash,
        dateOfBirth: new Date(dob),
        gender: genderMap[gender] ?? 'OTHER',
        country,
        state,
        city,
        area: area || null,
        pincode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        profilePhotoUrl: profilePhotoUrl || null,
        sports: dedupedSports.length > 0 ? {
          create: dedupedSports.map(s => ({
            sport: sportEnumMap[s.sport] ?? 'OTHER',
            skillLevel: s.skillLevel ? (skillMap[s.skillLevel] ?? null) : null,
            preferredRole: s.preferredRole || null,
            stats: s.stats && Object.keys(s.stats).length > 0 ? s.stats : null,
          })),
        } : undefined,
      },
      include: { sports: true },
    })

    const token = signToken(user.id)
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        profilePhotoUrl: user.profilePhotoUrl,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Registration failed', details: error.message })
  }
}

export const login = async (req, res) => {
  try {
    const { identifier, phone, username, password } = req.body
    const id = (identifier || phone || username || '').trim()
    if (!id || !password) {
      return res.status(400).json({ error: 'Phone/username and password are required' })
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ phone: id }, { username: id }] },
    })
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcryptjs.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = signToken(user.id)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        profilePhotoUrl: user.profilePhotoUrl,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
}
