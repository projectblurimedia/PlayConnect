import prisma from '../lib/prisma.js'

export const getNotifications = async (req, res) => {
  const myId = req.user.id

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: myId },
        include: {
          fromUser: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({ where: { userId: myId, read: false } })
    ])

    return res.json({ success: true, notifications, unreadCount })
  } catch (err) {
    console.error('getNotifications error:', err)
    return res.status(500).json({ error: 'Failed to get notifications' })
  }
}

export const markRead = async (req, res) => {
  const myId = req.user.id
  const { id } = req.params

  try {
    await prisma.notification.updateMany({
      where: { id, userId: myId },
      data: { read: true }
    })
    return res.json({ success: true })
  } catch (err) {
    console.error('markRead error:', err)
    return res.status(500).json({ error: 'Failed to mark read' })
  }
}

export const markAllRead = async (req, res) => {
  const myId = req.user.id

  try {
    await prisma.notification.updateMany({
      where: { userId: myId, read: false },
      data: { read: true }
    })
    return res.json({ success: true })
  } catch (err) {
    console.error('markAllRead error:', err)
    return res.status(500).json({ error: 'Failed to mark all read' })
  }
}
