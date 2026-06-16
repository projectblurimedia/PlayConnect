import prisma from '../lib/prisma.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIME_RE = /^([01]\d|2[0-3]):(00|30)$/

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

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Given the ground's daily open/close times and a list of busy {start,end} minute
// ranges for the date, compute the free gaps (each >= 30 minutes).
function computeFreeGaps(openTime, closeTime, busyRanges) {
  const open = timeToMinutes(openTime)
  const close = timeToMinutes(closeTime)

  const merged = busyRanges
    .slice()
    .sort((a, b) => a.start - b.start)
    .reduce((acc, r) => {
      const last = acc[acc.length - 1]
      if (last && r.start <= last.end) last.end = Math.max(last.end, r.end)
      else acc.push({ ...r })
      return acc
    }, [])

  const gaps = []
  let cursor = open
  for (const r of merged) {
    const start = Math.max(r.start, open)
    const end = Math.min(r.end, close)
    if (start > cursor && start - cursor >= 30) gaps.push({ start: cursor, end: start })
    cursor = Math.max(cursor, end)
  }
  if (close - cursor >= 30) gaps.push({ start: cursor, end: close })
  return gaps
}

async function assertOwner(groundId, userId) {
  const ground = await prisma.ground.findUnique({
    where: { id: groundId },
    select: {
      ownerId: true, name: true, pricePerHour: true,
      openTime: true, closeTime: true, supportedSports: true,
    },
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

// ── GET /api/grounds/:groundId/availability?date=YYYY-MM-DD ───────────────────
// Returns the ground's daily hours, existing bookings/blocks for the date, and
// the dynamically-computed free gaps (each >= 30 min).

export const getAvailability = async (req, res) => {
  const { groundId } = req.params
  const { date } = req.query

  if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' })

  const ground = await prisma.ground.findUnique({
    where: { id: groundId },
    select: {
      id: true, name: true, pricePerHour: true, ownerId: true,
      supportedSports: true, openTime: true, closeTime: true, groundType: true,
    },
  })
  if (!ground) return res.status(404).json({ error: 'Ground not found' })

  const slotDate = toDateOnly(date)
  const bookings = await prisma.groundSlot.findMany({
    where: {
      groundId,
      slotDate: { gte: slotDate, lt: new Date(slotDate.getTime() + 86400000) },
      status: { in: ['BOOKED', 'BLOCKED'] },
    },
    orderBy: { startTime: 'asc' },
    include: {
      bookedBy: { select: { id: true, fullName: true, username: true, phone: true, profilePhotoUrl: true } },
    },
  })

  const busyRanges = bookings.map(b => ({
    start: b.startTime.getUTCHours() * 60 + b.startTime.getUTCMinutes(),
    end: b.endTime.getUTCHours() * 60 + b.endTime.getUTCMinutes(),
  }))

  const availableSlots = computeFreeGaps(ground.openTime, ground.closeTime, busyRanges).map(g => ({
    startTime: buildDateTime(date, minutesToTime(g.start)),
    endTime: buildDateTime(date, minutesToTime(g.end)),
  }))

  res.json({ ground, bookings, availableSlots })
}

// ── POST /api/grounds/:groundId/bookings (user books a time range) ────────────
// body: { sport, date, startTime, endTime } — times as "HH:MM", 30-min grid

export const createBooking = async (req, res) => {
  const { groundId } = req.params
  const userId = req.user.id
  const { sport, date, startTime, endTime } = req.body

  if (!sport || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'sport, date, startTime and endTime are required' })
  }

  const ground = await prisma.ground.findUnique({
    where: { id: groundId },
    select: { ownerId: true, name: true, openTime: true, closeTime: true, supportedSports: true, pricePerHour: true },
  })
  if (!ground) return res.status(404).json({ error: 'Ground not found' })
  if (ground.ownerId === userId) return res.status(400).json({ error: 'Owner cannot book their own ground' })
  if (!ground.supportedSports.includes(sport)) {
    return res.status(400).json({ error: 'Ground does not support this sport' })
  }

  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return res.status(400).json({ error: 'startTime and endTime must be on the 30-minute grid (e.g. 08:00, 08:30)' })
  }

  const startMins = timeToMinutes(startTime)
  const endMins = timeToMinutes(endTime)
  if (endMins <= startMins) return res.status(400).json({ error: 'endTime must be after startTime' })
  if (endMins - startMins < 30) return res.status(400).json({ error: 'Minimum booking duration is 30 minutes' })

  const openMins = timeToMinutes(ground.openTime)
  const closeMins = timeToMinutes(ground.closeTime)
  if (startMins < openMins || endMins > closeMins) {
    return res.status(400).json({ error: `Ground is open from ${ground.openTime} to ${ground.closeTime}` })
  }

  const start = buildDateTime(date, startTime)
  const end = buildDateTime(date, endTime)
  if (start < new Date()) return res.status(400).json({ error: 'Cannot book a slot in the past' })

  const slotDate = toDateOnly(date)
  const existing = await prisma.groundSlot.findMany({
    where: {
      groundId,
      slotDate: { gte: slotDate, lt: new Date(slotDate.getTime() + 86400000) },
      status: { in: ['BOOKED', 'BLOCKED'] },
    },
    select: { startTime: true, endTime: true },
  })
  const overlaps = existing.some(s => start < s.endTime && end > s.startTime)
  if (overlaps) return res.status(409).json({ error: 'This time overlaps with an existing booking' })

  const bookingId = 'BK' + Date.now().toString(36).toUpperCase()

  const booking = await prisma.groundSlot.create({
    data: { groundId, sport, slotDate, startTime: start, endTime: end, status: 'BOOKED', bookedById: userId, bookingId },
    include: {
      ground: { select: { name: true, city: true, addressLine: true, pricePerHour: true } },
    },
  })

  res.status(201).json({ message: 'Booked successfully', booking })
}

// ── DELETE /api/grounds/:groundId/bookings/:bookingId (user cancels) ──────────

export const cancelBooking = async (req, res) => {
  const { groundId, bookingId } = req.params
  const userId = req.user.id

  const slot = await prisma.groundSlot.findUnique({
    where: { id: bookingId },
    include: { ground: { select: { ownerId: true } } },
  })
  if (!slot || slot.groundId !== groundId) return res.status(404).json({ error: 'Booking not found' })
  if (slot.status !== 'BOOKED') return res.status(400).json({ error: 'Not an active booking' })

  const isOwner = slot.ground.ownerId === userId
  const isBooker = slot.bookedById === userId
  if (!isOwner && !isBooker) return res.status(403).json({ error: 'Not your booking' })
  // Players can only cancel upcoming bookings; the owner can free up a slot
  // at any time (e.g. the player didn't show up).
  if (!isOwner && new Date(slot.startTime) < new Date()) {
    return res.status(400).json({ error: 'Cannot cancel a past booking' })
  }

  await prisma.groundSlot.delete({ where: { id: bookingId } })
  res.json({ message: 'Booking cancelled' })
}

// ── POST /api/grounds/:groundId/blocks (owner blocks a time range) ────────────
// body: { date, startTime, endTime }

export const createBlock = async (req, res) => {
  const { groundId } = req.params
  const { err, code, ground } = await assertOwner(groundId, req.user.id)
  if (err) return res.status(code).json({ error: err })

  const { date, startTime, endTime } = req.body
  if (!date || !startTime || !endTime) {
    return res.status(400).json({ error: 'date, startTime and endTime are required' })
  }

  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return res.status(400).json({ error: 'startTime and endTime must be on the 30-minute grid (e.g. 08:00, 08:30)' })
  }

  const startMins = timeToMinutes(startTime)
  const endMins = timeToMinutes(endTime)
  if (endMins <= startMins) return res.status(400).json({ error: 'endTime must be after startTime' })
  if (endMins - startMins < 30) return res.status(400).json({ error: 'Minimum block duration is 30 minutes' })

  const openMins = timeToMinutes(ground.openTime)
  const closeMins = timeToMinutes(ground.closeTime)
  if (startMins < openMins || endMins > closeMins) {
    return res.status(400).json({ error: `Ground is open from ${ground.openTime} to ${ground.closeTime}` })
  }

  const start = buildDateTime(date, startTime)
  const end = buildDateTime(date, endTime)
  const slotDate = toDateOnly(date)

  const existing = await prisma.groundSlot.findMany({
    where: {
      groundId,
      slotDate: { gte: slotDate, lt: new Date(slotDate.getTime() + 86400000) },
      status: { in: ['BOOKED', 'BLOCKED'] },
    },
    select: { startTime: true, endTime: true },
  })
  const overlaps = existing.some(s => start < s.endTime && end > s.startTime)
  if (overlaps) return res.status(409).json({ error: 'This time overlaps with an existing booking or block' })

  const block = await prisma.groundSlot.create({
    data: { groundId, sport: ground.supportedSports[0], slotDate, startTime: start, endTime: end, status: 'BLOCKED' },
  })

  res.status(201).json({ message: 'Time blocked', block })
}

// ── POST /api/grounds/:groundId/block-day (owner blocks entire day) ──────────
// Cancels all bookings + blocks for the date, then creates one full-day block.

export const blockEntireDay = async (req, res) => {
  const { groundId } = req.params
  const { err, code, ground } = await assertOwner(groundId, req.user.id)
  if (err) return res.status(code).json({ error: err })

  const { date } = req.body
  if (!date) return res.status(400).json({ error: 'date is required' })

  const slotDate = toDateOnly(date)

  // Delete all existing slots (bookings + blocks) for this date
  await prisma.groundSlot.deleteMany({
    where: {
      groundId,
      slotDate: { gte: slotDate, lt: new Date(slotDate.getTime() + 86400000) },
    },
  })

  // Create one full-day block covering all operating hours
  const start = buildDateTime(date, ground.openTime)
  const end = buildDateTime(date, ground.closeTime)

  const block = await prisma.groundSlot.create({
    data: { groundId, sport: ground.supportedSports[0], slotDate, startTime: start, endTime: end, status: 'BLOCKED' },
  })

  res.status(201).json({ message: 'Entire day blocked', block })
}

// ── DELETE /api/grounds/:groundId/blocks/:blockId (owner removes a block) ─────

export const deleteBlock = async (req, res) => {
  const { groundId, blockId } = req.params
  const { err, code } = await assertOwner(groundId, req.user.id)
  if (err) return res.status(code).json({ error: err })

  const block = await prisma.groundSlot.findUnique({ where: { id: blockId } })
  if (!block || block.groundId !== groundId) return res.status(404).json({ error: 'Block not found' })
  if (block.status !== 'BLOCKED') return res.status(400).json({ error: 'Not a block' })

  await prisma.groundSlot.delete({ where: { id: blockId } })
  res.json({ message: 'Block removed' })
}

// ── GET /api/grounds/my-bookings (user's own bookings) ────────────────────────

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
