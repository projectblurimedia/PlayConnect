import axios from 'axios'
import { store } from '../store'

export const API_BASE_URL = 'http://192.168.31.232:8080'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = store.getState().user.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Auth ────────────────────────────────────────────────────────────────────

export const checkUsername = async (username) => {
  const res = await api.get(`/api/auth/check-username?username=${encodeURIComponent(username)}`)
  return res.data
}

export const registerUser = async (payload) => {
  const res = await api.post('/api/auth/register', payload)
  return res.data
}

export const loginUser = async (payload) => {
  const res = await api.post('/api/auth/login', payload)
  return res.data
}

export const sendOTP = async (phone) => {
  const res = await api.post('/api/auth/otp/send', { phone })
  return res.data
}

export const verifyOTP = async (payload) => {
  const res = await api.post('/api/auth/otp/verify', payload)
  return res.data
}

export const forgotPasswordSendOTP = async (phone) => {
  const res = await api.post('/api/auth/forgot-password/send', { phone })
  return res.data
}

export const resetPassword = async (payload) => {
  const res = await api.post('/api/auth/forgot-password/reset', payload)
  return res.data
}

export const googleAuth = async (accessToken) => {
  const res = await api.post('/api/auth/google', { accessToken })
  return res.data
}

export const uploadProfilePhoto = async (base64, mimeType = 'image/jpeg') => {
  const res = await api.post('/api/upload/profile-photo', { base64, mimeType })
  return res.data
}

// ─── Search ──────────────────────────────────────────────────────────────────

export const searchPlayers = async (q, sport) => {
  const params = new URLSearchParams()
  if (q) params.append('q', q)
  if (sport) params.append('sport', sport)
  const res = await api.get(`/api/search/players?${params}`)
  return res.data
}

export const searchGrounds = async (q, sport) => {
  const params = new URLSearchParams()
  if (q) params.append('q', q)
  if (sport) params.append('sport', sport)
  const res = await api.get(`/api/search/grounds?${params}`)
  return res.data
}

// ─── Grounds ─────────────────────────────────────────────────────────────────

export const registerGround = async (payload) => {
  const res = await api.post('/api/grounds/register', payload)
  return res.data
}

export const getNearbyGrounds = async ({ city, state, lat, lng } = {}) => {
  const params = new URLSearchParams()
  if (city) params.append('city', city)
  if (state) params.append('state', state)
  if (lat) params.append('lat', lat)
  if (lng) params.append('lng', lng)
  const res = await api.get(`/api/grounds/nearby?${params}`)
  return res.data
}

// ─── Users / Players ─────────────────────────────────────────────────────────

export const getNearbyPlayers = async ({ city, state, sport } = {}) => {
  const params = new URLSearchParams()
  if (city) params.append('city', city)
  if (state) params.append('state', state)
  if (sport) params.append('sport', sport)
  const res = await api.get(`/api/users/nearby?${params}`)
  return res.data
}

export const getPlayerProfile = async (id) => {
  const res = await api.get(`/api/users/${id}`)
  return res.data
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export const getChatHistory = async (userId) => {
  const res = await api.get(`/api/chat/${userId}`)
  return res.data
}

export const getConversations = async () => {
  const res = await api.get('/api/messages/conversations')
  return res.data
}

export const deleteMessageForMe = async (messageId) => {
  const res = await api.delete(`/api/messages/${messageId}/for-me`)
  return res.data
}

export const deleteMessageForEveryone = async (messageId) => {
  const res = await api.delete(`/api/messages/${messageId}/for-everyone`)
  return res.data
}

export const forwardMessage = async (messageId, toId) => {
  const res = await api.post(`/api/messages/${messageId}/forward`, { toId })
  return res.data
}

export const deleteConversation = async (userId) => {
  const res = await api.delete(`/api/messages/conversation/${userId}`)
  return res.data
}

// ─── Connections ─────────────────────────────────────────────────────────────

export const sendConnectionRequest = async (userId) => {
  const res = await api.post('/api/connections/request', { userId })
  return res.data
}

export const acceptConnection = async (connectionId) => {
  const res = await api.post(`/api/connections/${connectionId}/accept`)
  return res.data
}

export const rejectConnection = async (connectionId) => {
  const res = await api.post(`/api/connections/${connectionId}/reject`)
  return res.data
}

export const getConnections = async () => {
  const res = await api.get('/api/connections')
  return res.data
}

export const getPendingRequests = async () => {
  const res = await api.get('/api/connections/pending')
  return res.data
}

export const getConnectionStatus = async (userId) => {
  const res = await api.get(`/api/connections/status/${userId}`)
  return res.data
}

// ─── Notifications ───────────────────────────────────────────────────────────

export const getNotifications = async () => {
  const res = await api.get('/api/notifications')
  return res.data
}

export const markNotificationRead = async (id) => {
  const res = await api.put(`/api/notifications/${id}/read`)
  return res.data
}

export const markAllNotificationsRead = async () => {
  const res = await api.put('/api/notifications/read-all')
  return res.data
}
