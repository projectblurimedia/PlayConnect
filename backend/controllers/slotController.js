import prisma from '../lib/prisma.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateOnly(dateStr) {
  const d = new Date(dateStr)
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

// Build a DateTime from "YYYY-MM-DD" + "HH:MM" treating them as UTC wall clock
function buildDateTime(dateStr, timeStr) {
  const d = new Date(dateStr)
  const [h, m] = timeStr.split(':').map(Number)
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), h, m))
}

async function assertOwner(groundId, userId) {
  const ground = await prisma.ground.findUnique({
    where: { id: groundId },
    select: { ownerId: true, name: true, pricePerHour: true },
  })
  if (!ground) return { err: 'Ground not found', code: 404 }
  if (ground.ownerId !== userId) return { err: 'Not authorized', code: 403 }
  return { ground }
}

// ── GET /api/grounds/:groundId (public detail) ────────────────────────────────

export const getGroundDetail = async (req, res) => {
  const { groundId } = req.params
  const ground = await prisma.ground.findUnique({
    where: { id: groundId },
    include: {
      owner: { select: { id: true, fullName: true, username: true, phone: true } },
    },
  })
  if (!ground) return res.status(404).json({ error: 'Ground not found' })
  res.json({ ground })
}

// ── GET /api/grounds/my-grounds (owner) ───────────────────────────────────────

export const getMyGrounds = async (req, res) => {
  const userId = req.user.id
  const grounds = await prisma.ground.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { slots: true } } },
  })
  res.json({ grounds })
}

// ── POST /api/grounds/:groundId/slots (owner creates slots) ───────────────────
// Single: { sport, date, startTime, endTime, priceOverride }
// Bulk:   { sport, fromDate, toDate, startTime, endTime, slotDurationMins, priceOverride }

export const createSlots = async (req, res) => {
  const { groundId } = req.params
  const { err, code } = await assertOwner(groundId, req.user.id)
  if (err) return res.status(code).json({ error: err })

  const {
    sport, date, fromDate, toDate,
    startTime, endTime,
    slotDurationMins = 60,
    priceOverride,
  } = req.body

  if (!sport || !startTime || !endTime) {
    return res.status(400).json({ error: 'sport, startTime and endTime are required' })
  }

  const data = []

  if (date) {
    const slotDate = toDateOnly(date)
    const start = buildDateTime(date, startTime)
    const end = buildDateTime(date, endTime)
    if (end <= start) return res.status(400).json({ error: 'endTime must be after startTime' })
    data.push({ groundId, sport, slotDate, startTime: start, endTime: end, priceOverride: priceOverride ?? null, status: 'AVAILABLE' })
  } else if (fromDate && toDate) {
    const durationMs = parseInt(slotDurationMins) * 60000
    const from = new Date(fromDate + 'T00:00:00Z')
    const to = new Date(toDate + 'T00:00:00Z')
    if (to < from) return res.status(400).json({ error: 'toDate must be after fromDate' })
    const diffDays = Math.ceil((to - from) / 86400000) + 1
    if (diffDays > 60) return res.status(400).json({ error: 'Max 60 days per bulk create' })

    const cur = new Date(from)
    while (cur <= to) {
      const ds = cur.toISOString().split('T')[0]
      const slotDate = toDateOnly(ds)
      let t = buildDateTime(ds, startTime)
      const windowEnd = buildDateTime(ds, endTime)
      while (t < windowEnd) {
        const te = new Date(t.getTime() + durationMs)
        if (te > windowEnd) break
        data.push({ groundId, sport, slotDate, startTime: new Date(t), endTime: new Date(te), priceOverride: priceOverride ?? null, status: 'AVAILABLE' })
        t = te
      }
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  } else {
    return res.status(400).json({ error: 'Provide date (single) or fromDate + toDate (bulk)' })
  }

  if (data.length === 0) return res.status(400).json({ error: 'No valid slots to create' })
  if (data.length > 600) return res.status(400).json({ error: 'Too many slots — reduce range or increase duration' })

  const result = await prisma.groundSlot.createMany({ data, skipDuplicates: false })
  res.status(201).json({ message: `${result.count} slot(s) created`, count: result.count })
}

// ── GET /api/grounds/:groundId/slots?date=YYYY-MM-DD&sport=CRICKET ────────────

export const getSlots = async (req, res) => {
  const { groundId } = req.params
  const { date, sport } = req.query

  const ground = await prisma.ground.findUnique({
    where: { id: groundId },
    select: { id: true, name: true, pricePerHour: true, ownerId: true, supportedSports: true },
  })
  if (!ground) return res.status(404).json({ error: 'Ground not found' })

  const where = { groundId }
  if (date) {
    const d = toDateOnly(date)
    where.slotDate = { gte: d, lt: new Date(d.getTime() + 86400000) }
  }
  if (sport) where.sport = sport

  const slots = await prisma.groundSlot.findMany({
    where,
    orderBy: [{ slotDate: 'asc' }, { startTime: 'asc' }],
    include: {
      bookedBy: { select: { id: true, fullName: true, username: true, phone: true, profilePhotoUrl: true } },
    },
  })

  res.json({ slots, ground })
}

// ── DELETE /api/grounds/:groundId/slots/:slotId (owner) ───────────────────────

export const deleteSlot = async (req, res) => {
  const { groundId, slotId } = req.params
  const { err, code } = await assertOwner(groundId, req.user.id)
  if (err) return res.status(code).json({ error: err })

  const slot = await prisma.groundSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.groundId !== groundId) return res.status(404).json({ error: 'Slot not found' })
  if (slot.status === 'BOOKED') return res.status(400).json({ error: 'Cannot delete a booked slot' })

  await prisma.groundSlot.delete({ where: { id: slotId } })
  res.json({ message: 'Slot deleted' })
}

// ── PUT /api/grounds/:groundId/slots/:slotId/status (owner block/unblock) ─────

export const updateSlotStatus = async (req, res) => {
  const { groundId, slotId } = req.params
  const { status } = req.body

  if (!['AVAILABLE', 'BLOCKED'].includes(status)) {
    return res.status(400).json({ error: 'status must be AVAILABLE or BLOCKED' })
  }

  const { err, code } = await assertOwner(groundId, req.user.id)
  if (err) return res.status(code).json({ error: err })

  const slot = await prisma.groundSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.groundId !== groundId) return res.status(404).json({ error: 'Slot not found' })
  if (slot.status === 'BOOKED') return res.status(400).json({ error: 'Cannot change status of a booked slot' })

  const updated = await prisma.groundSlot.update({ where: { id: slotId }, data: { status } })
  res.json({ slot: updated })
}

// ── POST /api/grounds/:groundId/slots/:slotId/book (user books) ───────────────

export const bookSlot = async (req, res) => {
  const { groundId, slotId } = req.params
  const userId = req.user.id

  const ground = await prisma.ground.findUnique({
    where: { id: groundId },
    select: { ownerId: true, name: true },
  })
  if (!ground) return res.status(404).json({ error: 'Ground not found' })
  if (ground.ownerId === userId) return res.status(400).json({ error: 'Owner cannot book their own ground' })

  const slot = await prisma.groundSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.groundId !== groundId) return res.status(404).json({ error: 'Slot not found' })
  if (slot.status !== 'AVAILABLE') {
    return res.status(409).json({ error: slot.status === 'BOOKED' ? 'Slot is already booked' : 'Slot is blocked by owner' })
  }
  if (new Date(slot.startTime) < new Date()) {
    return res.status(400).json({ error: 'Cannot book a past slot' })
  }

  const bookingId = 'BK' + Date.now().toString(36).toUpperCase()

  const booking = await prisma.groundSlot.update({
    where: { id: slotId },
    data: { status: 'BOOKED', bookedById: userId, bookingId },
    include: {
      ground: { select: { name: true, city: true, addressLine: true } },
    },
  })

  res.json({ message: 'Booked successfully', booking })
}

// ── DELETE /api/grounds/:groundId/slots/:slotId/book (user cancels) ───────────

export const cancelBooking = async (req, res) => {
  const { groundId, slotId } = req.params
  const userId = req.user.id

  const slot = await prisma.groundSlot.findUnique({ where: { id: slotId } })
  if (!slot || slot.groundId !== groundId) return res.status(404).json({ error: 'Slot not found' })
  if (slot.status !== 'BOOKED') return res.status(400).json({ error: 'Slot is not booked' })
  if (slot.bookedById !== userId) return res.status(403).json({ error: 'Not your booking' })
  if (new Date(slot.startTime) < new Date()) return res.status(400).json({ error: 'Cannot cancel a past booking' })

  await prisma.groundSlot.update({
    where: { id: slotId },
    data: { status: 'AVAILABLE', bookedById: null, bookingId: null },
  })

  res.json({ message: 'Booking cancelled' })
}

// ── GET /api/grounds/my-bookings (user's own bookings) ───────────────────────

export const getMyBookings = async (req, res) => {
  const userId = req.user.id
  const { filter } = req.query // upcoming | past

  const now = new Date()
  const where = { bookedById: userId, status: 'BOOKED' }
  if (filter === 'upcoming') where.startTime = { gte: now }
  else if (filter === 'past') where.startTime = { lt: now }

  const bookings = await prisma.groundSlot.findMany({
    where,
    orderBy: { startTime: filter === 'past' ? 'desc' : 'asc' },
    include: {
      ground: {
        select: { id: true, name: true, addressLine: true, city: true, photos: true, pricePerHour: true, contactPhone: true },
      },
    },
  })

  res.json({ bookings })
}
