import { Router } from 'express'
import { authenticate } from '../lib/authMiddleware.js'
import {
  createTeam,
  joinTeam,
  getMyTeams,
  searchTeams,
  getTeamDetail,
  assignRole,
  removeMember,
  leaveTeam,
  deleteTeam,
} from '../controllers/teamController.js'

const router = Router()

router.use(authenticate)

router.post('/', createTeam)
router.post('/join', joinTeam)
router.get('/', getMyTeams)
router.get('/search', searchTeams)       // must be before /:teamId
router.get('/:teamId', getTeamDetail)
router.put('/:teamId/assign-role', assignRole)
router.delete('/:teamId/members/:userId', removeMember)
router.post('/:teamId/leave', leaveTeam)
router.delete('/:teamId', deleteTeam)

export default router
