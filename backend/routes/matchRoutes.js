import { Router } from 'express'
import { authenticate } from '../lib/authMiddleware.js'
import {
  createMatch,
  getMatch,
  getLiveMatches,
  getRecentMatches,
  recordBall,
  setCurrentPlayers,
  undoLastBall,
  abandonMatch,
} from '../controllers/matchController.js'

const router = Router()

router.use(authenticate)

router.post('/', createMatch)
router.get('/live', getLiveMatches)
router.get('/recent', getRecentMatches)
router.get('/:matchId', getMatch)
router.post('/:matchId/ball', recordBall)
router.post('/:matchId/set-players', setCurrentPlayers)
router.post('/:matchId/undo', undoLastBall)
router.post('/:matchId/abandon', abandonMatch)

export default router
