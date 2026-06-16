import express from 'express'
import { registerGround, getNearbyGrounds } from '../controllers/groundController.js'
import {
  getGroundDetail, getMyGrounds, getMyBookings,
  getAvailability, createBooking, cancelBooking,
  createBlock, deleteBlock, blockEntireDay,
} from '../controllers/slotController.js'
import { authenticate } from '../lib/authMiddleware.js'

const router = express.Router()

router.use(authenticate)

// Static routes — must come BEFORE /:groundId
router.post('/register', registerGround)
router.get('/nearby', getNearbyGrounds)
router.get('/my-grounds', getMyGrounds)
router.get('/my-bookings', getMyBookings)

// Ground detail
router.get('/:groundId', getGroundDetail)

// Dynamic availability
router.get('/:groundId/availability', getAvailability)

// Booking (user)
router.post('/:groundId/bookings', createBooking)
router.delete('/:groundId/bookings/:bookingId', cancelBooking)

// Blocking (owner)
router.post('/:groundId/blocks', createBlock)
router.delete('/:groundId/blocks/:blockId', deleteBlock)
router.post('/:groundId/block-day', blockEntireDay)

export default router
