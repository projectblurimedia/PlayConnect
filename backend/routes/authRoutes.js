import { Router } from 'express'
import {
  checkUsername,
  register,
  login,
  sendOTP,
  verifyOTP,
  forgotPasswordSendOTP,
  resetPassword,
  googleAuth,
} from '../controllers/authController.js'

const router = Router()

router.get('/check-username', checkUsername)
router.post('/register', register)
router.post('/login', login)

// OTP login
router.post('/otp/send', sendOTP)
router.post('/otp/verify', verifyOTP)

// Forgot password
router.post('/forgot-password/send', forgotPasswordSendOTP)
router.post('/forgot-password/reset', resetPassword)

// Google OAuth
router.post('/google', googleAuth)

export default router
