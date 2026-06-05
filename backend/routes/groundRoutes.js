import express from 'express'
import { registerGround, getNearbyGrounds } from '../controllers/groundController.js'
import { authenticate } from '../lib/authMiddleware.js'

const router = express.Router()

router.post('/register', authenticate, registerGround)
router.get('/nearby', authenticate, getNearbyGrounds)

export default router
