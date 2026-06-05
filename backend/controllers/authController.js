import prisma from '../lib/prisma.js'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import sgMail from '@sendgrid/mail'

const genderMap = { Male: 'MALE', Female: 'FEMALE', Other: 'OTHER' }
const skillMap = { Beginner: 'BEGINNER', Intermediate: 'INTERMEDIATE', Advanced: 'ADVANCED', Professional: 'ADVANCED' }
const sportEnumMap = {
  CRICKET: 'CRICKET', FOOTBALL: 'FOOTBALL', BADMINTON: 'BADMINTON',
  BASKETBALL: 'BASKETBALL', VOLLEYBALL: 'VOLLEYBALL', KABADDI: 'KABADDI',
  TENNIS: 'TENNIS', TABLE_TENNIS: 'OTHER', HOCKEY: 'OTHER',
  RUNNING: 'OTHER', CYCLING: 'OTHER', SWIMMING: 'OTHER',
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

// ─── In-memory OTP store (email -> { otp, expiresAt }) ──────────────────────
// key prefix "reset_" used for forgot-password OTPs
const otpStore = new Map()

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function maskEmail(email) {
  const [local, domain] = email.split('@')
  return local[0] + '*'.repeat(Math.max(1, local.length - 1)) + '@' + domain
}

// ─── SendGrid email OTP sender ────────────────────────────────────────────────
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '')

async function sendEmailOTP(email, otp) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`\n📧 [DEV] OTP for ${email} → ${otp}  (Add SENDGRID_API_KEY to .env for real email)\n`)
    return
  }
  try {
    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Your PlayConnect OTP',
      text: `Your PlayConnect OTP is: ${otp}. It is valid for 5 minutes.`,
      html: `<div style="font-family:sans-serif;max-width:400px;margin:auto">
        <h2 style="color:#C8102E">PlayConnect</h2>
        <p>Your one-time password is:</p>
        <h1 style="letter-spacing:8px;color:#111">${otp}</h1>
        <p style="color:#888;font-size:13px">Valid for 5 minutes. Do not share this with anyone.</p>
      </div>`,
    })
  } catch (err) {
    console.error('SendGrid error:', err.response?.body || err.message)
  }
}

// ─── Existing endpoints ───────────────────────────────────────────────────────

export const checkUsername = async (req, res) => {
  const { username } = req.query
  if (!username || username.trim().length < 3) {
    return res.json({ available: false, message: 'Username must be at least 3 characters' })
  }
  try {
    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
      select: { id: true },
    })
    res.json({ available: !existing })
  } catch (error) {
    console.error('checkUsername error:', error)
    res.status(500).json({ available: false, message: 'Server error' })
  }
}

export const register = async (req, res) => {
  try {
    const {
      fullName, username, phone, password, dob, gender,
      country, state, city, area, pincode,
      latitude, longitude, profilePhotoUrl, sports,
    } = req.body

    if (!fullName?.trim() || !username?.trim() || !phone?.trim() || !dob || !gender || !country || !state || !city || !pincode) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const [existingUsername, existingPhone] = await Promise.all([
      prisma.user.findUnique({ where: { username: username.trim() }, select: { id: true } }),
      prisma.user.findUnique({ where: { phone: phone.trim() }, select: { id: true } }),
    ])
    if (existingUsername) return res.status(409).json({ error: 'Username already taken' })
    if (existingPhone) return res.status(409).json({ error: 'Phone number already registered' })

    const passwordHash = password ? await bcryptjs.hash(password, 10) : null

    const seenSports = new Set()
    const dedupedSports = (sports || []).filter(s => {
      const enumVal = sportEnumMap[s.sport] ?? 'OTHER'
      if (seenSports.has(enumVal)) return false
      seenSports.add(enumVal)
      return true
    })

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        username: username.trim(),
        phone: phone.trim(),
        passwordHash,
        dateOfBirth: new Date(dob),
        gender: genderMap[gender] ?? 'OTHER',
        country,
        state,
        city,
        area: area || null,
        pincode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        profilePhotoUrl: profilePhotoUrl || null,
        sports: dedupedSports.length > 0 ? {
          create: dedupedSports.map(s => ({
            sport: sportEnumMap[s.sport] ?? 'OTHER',
            skillLevel: s.skillLevel ? (skillMap[s.skillLevel] ?? null) : null,
            preferredRole: s.preferredRole || null,
            stats: s.stats && Object.keys(s.stats).length > 0 ? s.stats : null,
          })),
        } : undefined,
      },
      include: { sports: true },
    })

    const token = signToken(user.id)
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        profilePhotoUrl: user.profilePhotoUrl,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Registration failed', details: error.message })
  }
}

export const login = async (req, res) => {
  try {
    const { identifier, phone, username, password } = req.body
    const id = (identifier || phone || username || '').trim()
    if (!id || !password) {
      return res.status(400).json({ error: 'Phone/username and password are required' })
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ phone: id }, { username: id }] },
    })
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcryptjs.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = signToken(user.id)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        profilePhotoUrl: user.profilePhotoUrl,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
}

// ─── OTP login ────────────────────────────────────────────────────────────────

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })
    const normalEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: normalEmail },
      select: { id: true, email: true },
    })
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email. Please register first.' })
    }

    const otp = generateOTP()
    otpStore.set(normalEmail, { otp, expiresAt: Date.now() + 5 * 60 * 1000 })

    await sendEmailOTP(normalEmail, otp)

    res.json({ success: true, maskedEmail: maskEmail(normalEmail) })
  } catch (err) {
    console.error('sendOTP error:', err)
    res.status(500).json({ error: 'Failed to send OTP' })
  }
}

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' })
    const normalEmail = email.trim().toLowerCase()

    const stored = otpStore.get(normalEmail)
    if (!stored) return res.status(400).json({ error: 'No OTP found. Please request a new one.' })
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(normalEmail)
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' })
    }
    if (stored.otp !== String(otp)) {
      return res.status(400).json({ error: 'Incorrect OTP. Please try again.' })
    }

    otpStore.delete(normalEmail)

    const user = await prisma.user.findUnique({ where: { email: normalEmail } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const token = signToken(user.id)
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, fullName: user.fullName, phone: user.phone, profilePhotoUrl: user.profilePhotoUrl },
    })
  } catch (err) {
    console.error('verifyOTP error:', err)
    res.status(500).json({ error: 'OTP verification failed' })
  }
}

// ─── Forgot password ──────────────────────────────────────────────────────────

export const forgotPasswordSendOTP = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })
    const normalEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({ where: { email: normalEmail }, select: { id: true } })
    if (!user) return res.status(404).json({ error: 'No account found with this email.' })

    const otp = generateOTP()
    otpStore.set(`reset_${normalEmail}`, { otp, expiresAt: Date.now() + 5 * 60 * 1000 })

    await sendEmailOTP(normalEmail, otp)

    res.json({ success: true, maskedEmail: maskEmail(normalEmail) })
  } catch (err) {
    console.error('forgotPasswordSendOTP error:', err)
    res.status(500).json({ error: 'Failed to process request' })
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'All fields required' })
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const normalEmail = email.trim().toLowerCase()
    const stored = otpStore.get(`reset_${normalEmail}`)
    if (!stored) return res.status(400).json({ error: 'No OTP found. Please start over.' })
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(`reset_${normalEmail}`)
      return res.status(400).json({ error: 'OTP expired. Please start over.' })
    }
    if (stored.otp !== String(otp)) {
      return res.status(400).json({ error: 'Incorrect OTP.' })
    }

    otpStore.delete(`reset_${normalEmail}`)
    const passwordHash = await bcryptjs.hash(newPassword, 10)
    await prisma.user.update({ where: { email: normalEmail }, data: { passwordHash } })

    res.json({ success: true, message: 'Password reset successfully. Please login with your new password.' })
  } catch (err) {
    console.error('resetPassword error:', err)
    res.status(500).json({ error: 'Failed to reset password' })
  }
}

// ─── Google auth ──────────────────────────────────────────────────────────────

export const googleAuth = async (req, res) => {
  try {
    const { accessToken } = req.body
    if (!accessToken) return res.status(400).json({ error: 'Access token required' })

    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!infoRes.ok) return res.status(401).json({ error: 'Invalid Google access token' })
    const info = await infoRes.json()
    if (!info.id || !info.email) return res.status(400).json({ error: 'Invalid Google user data' })

    // Look for existing user by googleId or email
    const user = await prisma.user.findFirst({
      where: { OR: [{ googleId: info.id }, { email: info.email }] },
    })

    if (user) {
      // Backfill googleId if user was found only by email
      if (!user.googleId) {
        await prisma.user.update({ where: { id: user.id }, data: { googleId: info.id } })
      }
      const token = signToken(user.id)
      return res.json({
        success: true,
        token,
        user: { id: user.id, username: user.username, fullName: user.fullName, phone: user.phone, profilePhotoUrl: user.profilePhotoUrl },
      })
    }

    // No account found — tell frontend to redirect to registration
    res.json({
      success: false,
      needsRegistration: true,
      googleInfo: { googleId: info.id, email: info.email, name: info.name, photo: info.picture },
    })
  } catch (err) {
    console.error('googleAuth error:', err)
    res.status(500).json({ error: 'Google authentication failed' })
  }
}
