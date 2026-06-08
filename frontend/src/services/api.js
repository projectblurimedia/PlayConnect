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

export const sendOTP = async (email) => {
  const res = await api.post('/api/auth/otp/send', { email })
  return res.data
}

export const verifyOTP = async (payload) => {
  const res = await api.post('/api/auth/otp/verify', payload)
  return res.data
}

export const forgotPasswordSendOTP = async (email) => {
  const res = await api.post('/api/auth/forgot-password/send', { email })
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

export const uploadGroundPhoto = async (base64, mimeType = 'image/jpeg') => {
  const res = await api.post('/api/upload/ground-photo', { base64, mimeType })
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

// ─── Teams ───────────────────────────────────────────────────────────────────

export const createTeam = async (payload) => {
  const res = await api.post('/api/teams', payload)
  return res.data
}

export const joinTeam = async (inviteCode) => {
  const res = await api.post('/api/teams/join', { inviteCode })
  return res.data
}

export const getMyTeams = async () => {
  const res = await api.get('/api/teams')
  return res.data
}

export const getTeamDetail = async (teamId) => {
  const res = await api.get(`/api/teams/${teamId}`)
  return res.data
}

export const assignTeamRole = async (teamId, userId, role) => {
  const res = await api.put(`/api/teams/${teamId}/assign-role`, { userId, role })
  return res.data
}

export const removeTeamMember = async (teamId, userId) => {
  const res = await api.delete(`/api/teams/${teamId}/members/${userId}`)
  return res.data
}

export const leaveTeam = async (teamId) => {
  const res = await api.post(`/api/teams/${teamId}/leave`)
  return res.data
}

export const deleteTeam = async (teamId) => {
  const res = await api.delete(`/api/teams/${teamId}`)
  return res.data
}

export const searchTeams = async (q) => {
  const res = await api.get(`/api/teams/search?q=${encodeURIComponent(q)}`)
  return res.data
}

// ─── Ground Slots & Bookings ──────────────────────────────────────────────────

export const getGroundDetail = async (groundId) => {
  const res = await api.get(`/api/grounds/${groundId}`)
  return res.data
}

export const getMyGrounds = async () => {
  const res = await api.get('/api/grounds/my-grounds')
  return res.data
}

export const getMyBookings = async (filter) => {
  const params = filter ? `?filter=${filter}` : ''
  const res = await api.get(`/api/grounds/my-bookings${params}`)
  return res.data
}

export const createGroundSlots = async (groundId, payload) => {
  const res = await api.post(`/api/grounds/${groundId}/slots`, payload)
  return res.data
}

export const getGroundSlots = async (groundId, { date, sport } = {}) => {
  const params = new URLSearchParams()
  if (date) params.append('date', date)
  if (sport) params.append('sport', sport)
  const res = await api.get(`/api/grounds/${groundId}/slots?${params}`)
  return res.data
}

export const deleteGroundSlot = async (groundId, slotId) => {
  const res = await api.delete(`/api/grounds/${groundId}/slots/${slotId}`)
  return res.data
}

export const updateGroundSlotStatus = async (groundId, slotId, status) => {
  const res = await api.put(`/api/grounds/${groundId}/slots/${slotId}/status`, { status })
  return res.data
}

export const bookGroundSlot = async (groundId, slotId) => {
  const res = await api.post(`/api/grounds/${groundId}/slots/${slotId}/book`)
  return res.data
}

export const cancelGroundBooking = async (groundId, slotId) => {
  const res = await api.delete(`/api/grounds/${groundId}/slots/${slotId}/book`)
  return res.data
}
