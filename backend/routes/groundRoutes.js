import express from 'express'
import { registerGround, getNearbyGrounds } from '../controllers/groundController.js'
import {
  getGroundDetail, getMyGrounds, getMyBookings,
  createSlots, getSlots, deleteSlot, updateSlotStatus,
  bookSlot, cancelBooking,
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

// Slot management (owner)
router.post('/:groundId/slots', createSlots)
router.get('/:groundId/slots', getSlots)
router.delete('/:groundId/slots/:slotId', deleteSlot)
router.put('/:groundId/slots/:slotId/status', updateSlotStatus)

// Booking (user)
router.post('/:groundId/slots/:slotId/book', bookSlot)
router.delete('/:groundId/slots/:slotId/book', cancelBooking)

export default router
