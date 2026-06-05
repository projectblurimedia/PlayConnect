import { Router } from 'express'
import { checkUsername, register, login } from '../controllers/authController.js'

const router = Router()

router.get('/check-username', checkUsername)
router.post('/register', register)
router.post('/login', login)

export default router
