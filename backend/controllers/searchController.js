import prisma from '../lib/prisma.js'

export const searchPlayers = async (req, res) => {
  try {
    const { q = '', sport, limit = 20 } = req.query
    const where = { isActive: true }
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (sport) where.sports = { some: { sport } }

    const players = await prisma.user.findMany({
      where,
      take: parseInt(limit),
      select: {
        id: true, fullName: true, username: true, city: true, state: true,
        profilePhotoUrl: true, bio: true,
        sports: { select: { sport: true, skillLevel: true, preferredRole: true } },
      },
    })
    res.json({ success: true, players })
  } catch (error) {
    console.error('searchPlayers error:', error)
    res.status(500).json({ error: 'Search failed' })
  }
}

export const searchGrounds = async (req, res) => {
  try {
    const { q = '', sport, limit = 20 } = req.query
    const where = { isActive: true }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
        { addressLine: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (sport) where.supportedSports = { has: sport }

    const grounds = await prisma.ground.findMany({
      where,
      take: parseInt(limit),
      select: {
        id: true, name: true, city: true, state: true, addressLine: true,
        supportedSports: true, pricePerHour: true, isIndoor: true,
        surfaceType: true, photos: true, isVerified: true,
      },
    })
    res.json({ success: true, grounds })
  } catch (error) {
    console.error('searchGrounds error:', error)
    res.status(500).json({ error: 'Search failed' })
  }
}
