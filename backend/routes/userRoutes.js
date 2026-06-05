import express from 'express'
import { getNearbyPlayers, getPlayerProfile } from '../controllers/userController.js'
import { authenticate } from '../lib/authMiddleware.js'

const router = express.Router()

router.get('/nearby', authenticate, getNearbyPlayers)
router.get('/:id', authenticate, getPlayerProfile)

export default router
