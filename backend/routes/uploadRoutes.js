import { Router } from 'express'
import { uploadProfilePhoto, uploadGroundPhoto } from '../controllers/uploadController.js'
import { authenticate } from '../lib/authMiddleware.js'

const router = Router()

router.post('/profile-photo', uploadProfilePhoto)
router.post('/ground-photo', authenticate, uploadGroundPhoto)

export default router
