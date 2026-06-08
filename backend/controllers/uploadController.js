import { v2 as cloudinary } from 'cloudinary'
import 'dotenv/config'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const uploadProfilePhoto = async (req, res) => {
  try {
    const { base64, mimeType = 'image/jpeg' } = req.body
    if (!base64) return res.status(400).json({ error: 'No image data provided' })

    const dataUrl = `data:${mimeType};base64,${base64}`
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: 'playconnect/profiles',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    })

    res.json({ success: true, url: result.secure_url })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Upload failed', details: error.message })
  }
}

export const uploadGroundPhoto = async (req, res) => {
  try {
    const { base64, mimeType = 'image/jpeg' } = req.body
    if (!base64) return res.status(400).json({ error: 'No image data provided' })

    const dataUrl = `data:${mimeType};base64,${base64}`
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: 'playconnect/grounds',
      transformation: [{ width: 1200, height: 800, crop: 'fill', quality: 'auto' }],
    })

    res.json({ success: true, url: result.secure_url })
  } catch (error) {
    console.error('Ground photo upload error:', error)
    res.status(500).json({ error: 'Upload failed', details: error.message })
  }
}
