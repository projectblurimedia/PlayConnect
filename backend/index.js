import express from 'express'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import prisma from './lib/prisma.js'
import dotenv from 'dotenv'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import authRoutes from './routes/authRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import groundRoutes from './routes/groundRoutes.js'
import userRoutes from './routes/userRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import connectionRoutes from './routes/connectionRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import messageRoutes from './routes/messageRoutes.js'

dotenv.config()
const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 8080

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/grounds', groundRoutes)
app.use('/api/users', userRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/connections', connectionRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/messages', messageRoutes)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Authentication error'))
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = payload.userId
    next()
  } catch {
    next(new Error('Authentication error'))
  }
})

const onlineUsers = new Map() // userId -> socketId

io.on('connection', (socket) => {
  const uid = socket.userId
  onlineUsers.set(uid, socket.id)
  io.emit('user_online', uid)

  socket.on('send_message', async ({ toId, content }) => {
    if (!toId || !content?.trim()) return
    try {
      // Verify users are connected
      const connection = await prisma.connection.findFirst({
        where: {
          OR: [
            { requesterId: uid, receiverId: toId },
            { requesterId: toId, receiverId: uid },
          ],
          status: 'ACCEPTED'
        }
      })
      if (!connection) {
        socket.emit('chat_error', { error: 'You must be connected to message this user.' })
        return
      }

      const targetOnline = onlineUsers.has(toId)
      const msg = await prisma.message.create({
        data: {
          fromId: uid,
          toId,
          content: content.trim(),
          status: targetOnline ? 'DELIVERED' : 'SENT',
        },
        select: { id: true, fromId: true, toId: true, content: true, status: true, read: true, forwardedFromId: true, createdAt: true },
      })

      // Confirm to sender with final status
      socket.emit('message_sent', msg)

      // Deliver to recipient if online
      const targetSocket = onlineUsers.get(toId)
      if (targetSocket) {
        io.to(targetSocket).emit('new_message', msg)
      }
    } catch (err) {
      console.error('send_message error:', err.message)
      socket.emit('chat_error', { error: 'Failed to send message.' })
    }
  })

  socket.on('mark_read', async ({ fromId }) => {
    try {
      await prisma.message.updateMany({
        where: { fromId, toId: uid, read: false },
        data: { read: true, status: 'READ' },
      })
      // Notify sender that messages were read
      const senderSocket = onlineUsers.get(fromId)
      if (senderSocket) {
        io.to(senderSocket).emit('messages_read', { byUserId: uid })
      }
    } catch (err) {
      console.error('mark_read error:', err.message)
    }
  })

  socket.on('disconnect', () => {
    onlineUsers.delete(uid)
    io.emit('user_offline', uid)
  })
})

// REST: chat history (also handled by messageController but kept here for compatibility)
app.get('/api/chat/:userId', async (req, res) => {
  const token = req.headers.authorization?.slice(7)
  if (!token) return res.status(401).json({ error: 'No token' })
  let myId
  try { myId = jwt.verify(token, process.env.JWT_SECRET).userId } catch { return res.status(401).json({ error: 'Invalid token' }) }

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromId: myId, toId: req.params.userId, deletedForSender: false, deletedForEveryone: false },
          { fromId: req.params.userId, toId: myId, deletedForReceiver: false, deletedForEveryone: false },
        ],
      },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ success: true, messages })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages', messages: [] })
  }
})

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`)
  try {
    await prisma.$connect()
    console.log('✅ Prisma connected')
  } catch (error) {
    console.error('❌ Prisma connection failed:', error)
  }
})
