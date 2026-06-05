import prisma from '../lib/prisma.js'

export const getConversations = async (req, res) => {
  const myId = req.user.id

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromId: myId, deletedForSender: false, deletedForEveryone: false },
          { toId: myId, deletedForReceiver: false, deletedForEveryone: false },
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        from: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } },
        to: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } },
      }
    })

    const conversationMap = new Map()
    for (const msg of messages) {
      const partnerId = msg.fromId === myId ? msg.toId : msg.fromId
      if (!conversationMap.has(partnerId)) {
        const partner = msg.fromId === myId ? msg.to : msg.from
        conversationMap.set(partnerId, {
          user: partner,
          lastMessage: msg,
          unreadCount: 0,
        })
      }
      if (msg.toId === myId && msg.status !== 'READ') {
        conversationMap.get(partnerId).unreadCount++
      }
    }

    return res.json({ success: true, conversations: Array.from(conversationMap.values()) })
  } catch (err) {
    console.error('getConversations error:', err)
    return res.status(500).json({ error: 'Failed to get conversations', conversations: [] })
  }
}

export const deleteForMe = async (req, res) => {
  const myId = req.user.id
  const { messageId } = req.params

  try {
    const msg = await prisma.message.findUnique({ where: { id: messageId } })
    if (!msg) return res.status(404).json({ error: 'Message not found' })
    if (msg.fromId !== myId && msg.toId !== myId) return res.status(403).json({ error: 'Not authorized' })

    if (msg.fromId === myId) {
      await prisma.message.update({ where: { id: messageId }, data: { deletedForSender: true } })
    } else {
      await prisma.message.update({ where: { id: messageId }, data: { deletedForReceiver: true } })
    }

    return res.json({ success: true })
  } catch (err) {
    console.error('deleteForMe error:', err)
    return res.status(500).json({ error: 'Failed to delete message' })
  }
}

export const deleteForEveryone = async (req, res) => {
  const myId = req.user.id
  const { messageId } = req.params

  try {
    const msg = await prisma.message.findUnique({ where: { id: messageId } })
    if (!msg) return res.status(404).json({ error: 'Message not found' })
    if (msg.fromId !== myId) return res.status(403).json({ error: 'Only sender can delete for everyone' })

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedForEveryone: true, content: 'This message was deleted' }
    })

    return res.json({ success: true })
  } catch (err) {
    console.error('deleteForEveryone error:', err)
    return res.status(500).json({ error: 'Failed to delete message' })
  }
}

export const forwardMessage = async (req, res) => {
  const myId = req.user.id
  const { messageId } = req.params
  const { toId } = req.body

  if (!toId) return res.status(400).json({ error: 'toId required' })

  try {
    const original = await prisma.message.findUnique({ where: { id: messageId } })
    if (!original) return res.status(404).json({ error: 'Message not found' })
    if (original.deletedForEveryone) return res.status(400).json({ error: 'Cannot forward deleted message' })

    const connected = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: myId, receiverId: toId },
          { requesterId: toId, receiverId: myId },
        ],
        status: 'ACCEPTED'
      }
    })
    if (!connected) return res.status(403).json({ error: 'Not connected with this user' })

    const newMsg = await prisma.message.create({
      data: { fromId: myId, toId, content: original.content, forwardedFromId: messageId },
      select: { id: true, fromId: true, toId: true, content: true, status: true, forwardedFromId: true, createdAt: true }
    })

    return res.json({ success: true, message: newMsg })
  } catch (err) {
    console.error('forwardMessage error:', err)
    return res.status(500).json({ error: 'Failed to forward message' })
  }
}

export const deleteConversation = async (req, res) => {
  const myId = req.user.id
  const { userId } = req.params

  try {
    await Promise.all([
      prisma.message.updateMany({
        where: { fromId: myId, toId: userId },
        data: { deletedForSender: true }
      }),
      prisma.message.updateMany({
        where: { fromId: userId, toId: myId },
        data: { deletedForReceiver: true }
      }),
    ])
    return res.json({ success: true })
  } catch (err) {
    console.error('deleteConversation error:', err)
    return res.status(500).json({ error: 'Failed to delete conversation' })
  }
}

export const getChatHistory = async (req, res) => {
  const token = req.headers.authorization?.slice(7)
  if (!token) return res.status(401).json({ error: 'No token' })

  let myId
  try {
    const jwt = (await import('jsonwebtoken')).default
    myId = jwt.verify(token, process.env.JWT_SECRET).userId
  } catch { return res.status(401).json({ error: 'Invalid token' }) }

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
}
