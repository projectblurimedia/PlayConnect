import { Router } from 'express'
import { authenticate } from '../lib/authMiddleware.js'
import { getConversations, deleteForMe, deleteForEveryone, forwardMessage, deleteConversation } from '../controllers/messageController.js'

const router = Router()

router.use(authenticate)

router.get('/conversations', getConversations)
router.delete('/:messageId/for-me', deleteForMe)
router.delete('/:messageId/for-everyone', deleteForEveryone)
router.post('/:messageId/forward', forwardMessage)
router.delete('/conversation/:userId', deleteConversation)

export default router
