import prisma from '../lib/prisma.js'

export const sendRequest = async (req, res) => {
  const myId = req.user.id
  const { userId: targetId } = req.body

  if (!targetId) return res.status(400).json({ error: 'userId required' })
  if (targetId === myId) return res.status(400).json({ error: 'Cannot connect with yourself' })

  try {
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: myId, receiverId: targetId },
          { requesterId: targetId, receiverId: myId },
        ]
      }
    })

    if (existing) {
      if (existing.status === 'ACCEPTED') return res.status(400).json({ error: 'Already connected' })
      if (existing.status === 'PENDING') {
        // If the other person sent us a request, auto-accept it
        if (existing.requesterId === targetId) {
          const updated = await prisma.connection.update({
            where: { id: existing.id },
            data: { status: 'ACCEPTED' }
          })
          await prisma.notification.create({
            data: { userId: targetId, fromUserId: myId, type: 'CONNECTION_ACCEPTED', data: { connectionId: existing.id } }
          })
          return res.json({ success: true, connection: updated, autoAccepted: true })
        }
        return res.status(400).json({ error: 'Request already pending' })
      }
      if (existing.status === 'REJECTED') {
        const updated = await prisma.connection.update({
          where: { id: existing.id },
          data: { status: 'PENDING', requesterId: myId, receiverId: targetId }
        })
        await prisma.notification.create({
          data: { userId: targetId, fromUserId: myId, type: 'CONNECTION_REQUEST', data: { connectionId: existing.id } }
        })
        return res.json({ success: true, connection: updated })
      }
    }

    const connection = await prisma.connection.create({
      data: { requesterId: myId, receiverId: targetId }
    })

    await prisma.notification.create({
      data: { userId: targetId, fromUserId: myId, type: 'CONNECTION_REQUEST', data: { connectionId: connection.id } }
    })

    return res.json({ success: true, connection })
  } catch (err) {
    console.error('sendRequest error:', err)
    return res.status(500).json({ error: 'Failed to send request' })
  }
}

export const acceptRequest = async (req, res) => {
  const myId = req.user.id
  const { connectionId } = req.params

  try {
    const connection = await prisma.connection.findUnique({ where: { id: connectionId } })
    if (!connection) return res.status(404).json({ error: 'Connection not found' })
    if (connection.receiverId !== myId) return res.status(403).json({ error: 'Not authorized' })
    if (connection.status !== 'PENDING') return res.status(400).json({ error: 'Connection not pending' })

    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'ACCEPTED' }
    })

    await prisma.notification.create({
      data: {
        userId: connection.requesterId,
        fromUserId: myId,
        type: 'CONNECTION_ACCEPTED',
        data: { connectionId }
      }
    })

    // Mark the connection_request notification as read
    await prisma.notification.updateMany({
      where: {
        userId: myId,
        fromUserId: connection.requesterId,
        type: 'CONNECTION_REQUEST',
        read: false
      },
      data: { read: true }
    })

    return res.json({ success: true, connection: updated })
  } catch (err) {
    console.error('acceptRequest error:', err)
    return res.status(500).json({ error: 'Failed to accept request' })
  }
}

export const rejectRequest = async (req, res) => {
  const myId = req.user.id
  const { connectionId } = req.params

  try {
    const connection = await prisma.connection.findUnique({ where: { id: connectionId } })
    if (!connection) return res.status(404).json({ error: 'Connection not found' })
    if (connection.receiverId !== myId) return res.status(403).json({ error: 'Not authorized' })

    await prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'REJECTED' }
    })

    return res.json({ success: true })
  } catch (err) {
    console.error('rejectRequest error:', err)
    return res.status(500).json({ error: 'Failed to reject request' })
  }
}

export const getConnections = async (req, res) => {
  const myId = req.user.id

  try {
    const connections = await prisma.connection.findMany({
      where: {
        OR: [{ requesterId: myId }, { receiverId: myId }],
        status: 'ACCEPTED',
      },
      include: {
        requester: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true, city: true, state: true, sports: { select: { sport: true, skillLevel: true } } } },
        receiver: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true, city: true, state: true, sports: { select: { sport: true, skillLevel: true } } } },
      },
      orderBy: { updatedAt: 'desc' }
    })

    const friends = connections.map(c => ({
      connectionId: c.id,
      user: c.requesterId === myId ? c.receiver : c.requester,
    }))

    return res.json({ success: true, connections: friends })
  } catch (err) {
    console.error('getConnections error:', err)
    return res.status(500).json({ error: 'Failed to get connections' })
  }
}

export const getStatus = async (req, res) => {
  const myId = req.user.id
  const { userId } = req.params

  try {
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: myId, receiverId: userId },
          { requesterId: userId, receiverId: myId },
        ]
      }
    })

    if (!connection) return res.json({ success: true, status: 'NONE', connection: null, isSender: false })

    return res.json({
      success: true,
      status: connection.status,
      connection: { id: connection.id, requesterId: connection.requesterId, receiverId: connection.receiverId },
      isSender: connection.requesterId === myId,
    })
  } catch (err) {
    console.error('getStatus error:', err)
    return res.status(500).json({ error: 'Failed to get status' })
  }
}

export const getPendingRequests = async (req, res) => {
  const myId = req.user.id

  try {
    const pending = await prisma.connection.findMany({
      where: { receiverId: myId, status: 'PENDING' },
      include: {
        requester: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true, city: true, state: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return res.json({ success: true, requests: pending })
  } catch (err) {
    console.error('getPendingRequests error:', err)
    return res.status(500).json({ error: 'Failed to get requests' })
  }
}
