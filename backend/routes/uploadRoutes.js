import { Router } from 'express'
import { uploadProfilePhoto } from '../controllers/uploadController.js'

const router = Router()

router.post('/profile-photo', uploadProfilePhoto)

export default router
