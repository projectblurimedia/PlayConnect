import express from 'express'
import { searchPlayers, searchGrounds } from '../controllers/searchController.js'
import { authenticate } from '../lib/authMiddleware.js'

const router = express.Router()

router.get('/players', authenticate, searchPlayers)
router.get('/grounds', authenticate, searchGrounds)

export default router
