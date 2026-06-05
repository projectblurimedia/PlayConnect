import { Router } from 'express'
import { authenticate } from '../lib/authMiddleware.js'
import {
  sendRequest,
  acceptRequest,
  rejectRequest,
  getConnections,
  getStatus,
  getPendingRequests,
} from '../controllers/connectionController.js'

const router = Router()

router.use(authenticate)

router.post('/request', sendRequest)
router.post('/:connectionId/accept', acceptRequest)
router.post('/:connectionId/reject', rejectRequest)
router.get('/', getConnections)
router.get('/pending', getPendingRequests)
router.get('/status/:userId', getStatus)

export default router
