import prisma from '../lib/prisma.js'
import { uploadToS3 } from '../lib/s3.js'

// POST /api/posts — create a post
export const createPost = async (req, res) => {
  const { type, caption, sport, base64, mimeType, thumbnailBase64 } = req.body

  if (!base64 || !mimeType || !type) {
    return res.status(400).json({ error: 'Missing required fields: base64, mimeType, type' })
  }

  const mediaUrl = await uploadToS3(base64, mimeType, 'posts')

  let thumbnailUrl = null
  if (thumbnailBase64 && (type === 'VIDEO' || type === 'REEL')) {
    thumbnailUrl = await uploadToS3(thumbnailBase64, 'image/jpeg', 'thumbnails')
  }

  const post = await prisma.post.create({
    data: {
      authorId: req.user.id,
      type,
      caption: caption || '',
      mediaUrl,
      thumbnailUrl,
      sport: sport || null,
    },
    include: {
      author: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } },
      _count: { select: { likes: true, comments: true } },
    },
  })

  res.json({ success: true, post: { ...post, likesCount: post._count.likes, commentsCount: post._count.comments, isLiked: false, _count: undefined } })
}

// GET /api/posts/feed?page=1&type=PHOTO
export const getFeed = async (req, res) => {
  const { page = 1, limit = 20, type } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const posts = await prisma.post.findMany({
    where: type ? { type } : {},
    skip,
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: req.user.id }, select: { id: true } },
    },
  })

  const feed = posts.map(p => ({
    ...p,
    isLiked: p.likes.length > 0,
    likesCount: p._count.likes,
    commentsCount: p._count.comments,
    likes: undefined,
    _count: undefined,
  }))

  res.json({ posts: feed })
}

// GET /api/posts/user/:userId
export const getUserPosts = async (req, res) => {
  const { userId } = req.params

  const posts = await prisma.post.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: req.user.id }, select: { id: true } },
    },
  })

  const result = posts.map(p => ({
    ...p,
    isLiked: p.likes.length > 0,
    likesCount: p._count.likes,
    commentsCount: p._count.comments,
    likes: undefined,
    _count: undefined,
  }))

  res.json({ posts: result })
}

// POST /api/posts/:postId/like — toggle like
export const toggleLike = async (req, res) => {
  const { postId } = req.params

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId: req.user.id } },
  })

  if (existing) {
    await prisma.like.delete({ where: { postId_userId: { postId, userId: req.user.id } } })
    const count = await prisma.like.count({ where: { postId } })
    return res.json({ liked: false, likesCount: count })
  }

  await prisma.like.create({ data: { postId, userId: req.user.id } })
  const count = await prisma.like.count({ where: { postId } })
  res.json({ liked: true, likesCount: count })
}

// GET /api/posts/:postId/comments
export const getComments = async (req, res) => {
  const { postId } = req.params

  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } },
    },
  })

  res.json({ comments })
}

// POST /api/posts/:postId/comments
export const addComment = async (req, res) => {
  const { postId } = req.params
  const { text } = req.body

  if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' })

  const comment = await prisma.comment.create({
    data: { postId, authorId: req.user.id, text: text.trim() },
    include: {
      author: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } },
    },
  })

  res.json({ comment })
}

// DELETE /api/posts/:postId
export const deletePost = async (req, res) => {
  const { postId } = req.params

  const post = await prisma.post.findUnique({ where: { id: postId } })
  if (!post || post.authorId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  await prisma.post.delete({ where: { id: postId } })
  res.json({ success: true })
}
