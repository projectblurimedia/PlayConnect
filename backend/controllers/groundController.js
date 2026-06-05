import prisma from '../lib/prisma.js'

export const registerGround = async (req, res) => {
  try {
    const {
      name, description, contactPhone,
      addressLine, city, state, pincode, latitude, longitude,
      supportedSports, surfaceType, isIndoor, amenities, capacity,
      pricePerHour, rules, cancellationPolicy, photos,
    } = req.body

    if (!name?.trim() || !contactPhone?.trim() || !addressLine?.trim() || !city?.trim() || !state?.trim() || !pincode?.trim()) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (!supportedSports?.length) {
      return res.status(400).json({ error: 'Select at least one sport' })
    }
    if (!pricePerHour) {
      return res.status(400).json({ error: 'Price per hour is required' })
    }

    const lat = latitude ? parseFloat(latitude) : 0
    const lng = longitude ? parseFloat(longitude) : 0

    const ground = await prisma.ground.create({
      data: {
        ownerId: req.user.id,
        name: name.trim(),
        description: description?.trim() || null,
        contactPhone: contactPhone.trim(),
        addressLine: addressLine.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        latitude: lat,
        longitude: lng,
        supportedSports,
        surfaceType: surfaceType || null,
        isIndoor: isIndoor ?? false,
        amenities: amenities || [],
        capacity: capacity || null,
        pricePerHour: parseFloat(pricePerHour),
        rules: rules?.trim() || null,
        cancellationPolicy: cancellationPolicy?.trim() || null,
        photos: photos || [],
        isVerified: false,
      },
    })

    res.status(201).json({ success: true, ground })
  } catch (error) {
    console.error('registerGround error:', error)
    res.status(500).json({ error: 'Failed to register ground', details: error.message })
  }
}

export const getNearbyGrounds = async (req, res) => {
  try {
    const { city, state, lat, lng, limit = 20 } = req.query
    const where = { isActive: true }
    if (city) where.city = { contains: city, mode: 'insensitive' }
    else if (state) where.state = { contains: state, mode: 'insensitive' }

    const grounds = await prisma.ground.findMany({
      where,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, city: true, state: true, addressLine: true,
        supportedSports: true, pricePerHour: true, isIndoor: true,
        surfaceType: true, photos: true, isVerified: true, latitude: true, longitude: true,
      },
    })

    if (lat && lng) {
      const userLat = parseFloat(lat), userLng = parseFloat(lng)
      const haversine = (a, b) => {
        const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
      }
      grounds.forEach(g => {
        g.distanceKm = g.latitude && g.longitude
          ? haversine({ lat: userLat, lng: userLng }, { lat: g.latitude, lng: g.longitude }).toFixed(1)
          : null
      })
      grounds.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999))
    }

    res.json({ success: true, grounds })
  } catch (error) {
    console.error('getNearbyGrounds error:', error)
    res.status(500).json({ error: 'Failed to fetch grounds' })
  }
}
