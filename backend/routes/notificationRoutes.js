import { Router } from 'express'
import { authenticate } from '../lib/authMiddleware.js'
import { getNotifications, markRead, markAllRead } from '../controllers/notificationController.js'

const router = Router()

router.use(authenticate)

router.get('/', getNotifications)
router.put('/read-all', markAllRead)
router.put('/:id/read', markRead)

export default router
