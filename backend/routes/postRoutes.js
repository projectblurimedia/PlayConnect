import express from 'express'
import { authenticate } from '../lib/authMiddleware.js'
import {
  createPost, getFeed, getUserPosts,
  toggleLike, getComments, addComment, deletePost,
} from '../controllers/postController.js'

const router = express.Router()

router.use(authenticate)

router.get('/feed', getFeed)
router.post('/', createPost)
router.get('/user/:userId', getUserPosts)
router.post('/:postId/like', toggleLike)
router.get('/:postId/comments', getComments)
router.post('/:postId/comments', addComment)
router.delete('/:postId', deletePost)

export default router
