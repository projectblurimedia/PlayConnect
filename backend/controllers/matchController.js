import prisma from '../lib/prisma.js'
import { rollUpStats } from '../utils/cricketStats.js'

function displayOvers(legalBalls) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`
}

// Wide / no-ball each carry a fixed 1-run penalty in addition to any runs run.
function extraPenaltyFor(extraType) {
  return (extraType === 'WIDE' || extraType === 'NO_BALL') ? 1 : 0
}

async function getMatchData(matchId) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      team1: {
        include: {
          members: {
            include: {
              user: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } },
            },
          },
        },
      },
      team2: {
        include: {
          members: {
            include: {
              user: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } },
            },
          },
        },
      },
      innings: {
        include: {
          balls: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { inningNumber: 'asc' },
      },
      players: {
        include: {
          user: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } },
        },
      },
    },
  })
}

// Lightweight match payload for live scoring updates (recordBall / undo).
// Skips team member rosters (static, already cached on the client) and only
// includes ball-by-ball history for the inning the ball belongs to, so the
// response/broadcast doesn't keep growing as a match progresses.
async function getMatchUpdateData(matchId, ballsInningNumber) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      team1: { select: { id: true, name: true } },
      team2: { select: { id: true, name: true } },
      innings: {
        include: {
          balls: {
            where: { inning: { inningNumber: ballsInningNumber } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { inningNumber: 'asc' },
      },
      players: {
        include: {
          user: { select: { id: true, fullName: true, username: true, profilePhotoUrl: true } },
        },
      },
    },
  })
  if (!match) return null
  match.innings = match.innings.map(inn =>
    inn.inningNumber === ballsInningNumber ? inn : { ...inn, balls: undefined }
  )
  return match
}

async function calcBestPerformers(matchId) {
  const players = await prisma.matchPlayer.findMany({ where: { matchId } })

  const batters = players.filter(p => p.ballsFaced > 0)
  const bestBatsman = batters.sort((a, b) =>
    b.runsScored - a.runsScored || a.ballsFaced - b.ballsFaced
  )[0]

  const bowlers = players.filter(p => p.legalBallsBowled > 0)
  const bestBowler = bowlers.sort((a, b) =>
    b.wicketsTaken - a.wicketsTaken || a.runsConceded - b.runsConceded
  )[0]

  const mvpScores = players.map(p => ({
    userId: p.userId,
    score: p.runsScored / 20 + p.wicketsTaken * 2.5 + p.fours * 0.3 + p.sixes * 0.6,
  }))
  const mvp = mvpScores.sort((a, b) => b.score - a.score)[0]

  return {
    bestBatsmanId: bestBatsman?.userId || null,
    bestBowlerId: bestBowler?.userId || null,
    mvpId: mvp?.userId || null,
  }
}

// Rolls each player's per-match MatchPlayer stats into their career UserSport totals,
// both overall and broken down by format + ball type (e.g. "T20_LEATHER").
async function updatePlayerCareerStats(matchId, winnerTeamId) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { matchFormat: true, ballType: true } })
  const formatKey = `${match?.matchFormat || 'CUSTOM'}_${match?.ballType || 'LEATHER'}`
  const players = await prisma.matchPlayer.findMany({ where: { matchId } })

  for (const p of players) {
    const existing = await prisma.userSport.findUnique({
      where: { userId_sport: { userId: p.userId, sport: 'CRICKET' } },
    })
    const prevStats = existing?.stats || {}
    const won = winnerTeamId && p.teamId === winnerTeamId

    const prevFormats = prevStats.formats || {}
    const prevFormatStats = prevFormats[formatKey] || {}

    const newStats = {
      ...rollUpStats(prevStats, p),
      formats: {
        ...prevFormats,
        [formatKey]: {
          ...rollUpStats(prevFormatStats, p),
          matchesPlayed: (prevFormatStats.matchesPlayed || 0) + 1,
          matchesWon: (prevFormatStats.matchesWon || 0) + (won ? 1 : 0),
        },
      },
    }

    await prisma.userSport.upsert({
      where: { userId_sport: { userId: p.userId, sport: 'CRICKET' } },
      create: { userId: p.userId, sport: 'CRICKET', matchesPlayed: 1, matchesWon: won ? 1 : 0, stats: newStats },
      update: {
        matchesPlayed: { increment: 1 },
        ...(won && { matchesWon: { increment: 1 } }),
        stats: newStats,
      },
    })
  }
}

// ─── POST /api/matches ────────────────────────────────────────────────────────

export const createMatch = async (req, res) => {
  const {
    team1Id,
    team2Id,
    totalOvers,
    matchFormat = 'CUSTOM',
    ballType = 'LEATHER',
    powerplayOvers = 6,
    isTest = false,
    tossWonByTeamId,
    tossChoice,
    openingBatsman1Id,
    openingBatsman2Id,
    openingBowlerId,
    team1PlayerIds = [],
    team2PlayerIds = [],
  } = req.body

  const userId = req.user.id

  if (!team1Id || !team2Id || !tossWonByTeamId || !tossChoice)
    return res.status(400).json({ error: 'Missing required fields' })
  if (!['BAT', 'BOWL'].includes(tossChoice))
    return res.status(400).json({ error: 'tossChoice must be BAT or BOWL' })

  const overs = isTest ? 0 : (Number(totalOvers) || 20)

  const battingFirstTeamId =
    tossWonByTeamId === team1Id
      ? tossChoice === 'BAT' ? team1Id : team2Id
      : tossChoice === 'BAT' ? team2Id : team1Id

  const bowlingFirstTeamId = battingFirstTeamId === team1Id ? team2Id : team1Id

  let createdMatch = null
  try {
    createdMatch = await prisma.match.create({
      data: {
        team1Id,
        team2Id,
        totalOvers: overs,
        matchFormat,
        ballType,
        powerplayOvers: Number(powerplayOvers) || 6,
        isTest,
        tossWonByTeamId,
        tossChoice,
        battingFirstTeamId,
        status: 'IN_PROGRESS',
        currentInning: 1,
        strikerBatsmanId: openingBatsman1Id || null,
        nonStrikerBatsmanId: openingBatsman2Id || null,
        currentBowlerId: openingBowlerId || null,
        createdBy: userId,
      },
    })

    await prisma.matchInning.create({
      data: {
        matchId: createdMatch.id,
        inningNumber: 1,
        battingTeamId: battingFirstTeamId,
        bowlingTeamId: bowlingFirstTeamId,
      },
    })

    const allPlayers = [
      ...team1PlayerIds.map(uid => ({ matchId: createdMatch.id, userId: uid, teamId: team1Id })),
      ...team2PlayerIds.map(uid => ({ matchId: createdMatch.id, userId: uid, teamId: team2Id })),
    ]
    if (allPlayers.length > 0) {
      await prisma.matchPlayer.createMany({ data: allPlayers, skipDuplicates: true })
    }

    const fullMatch = await getMatchData(createdMatch.id)
    res.status(201).json({ success: true, match: fullMatch })
  } catch (err) {
    console.error('createMatch error:', err)
    if (createdMatch) {
      await prisma.match.delete({ where: { id: createdMatch.id } }).catch(() => {})
    }
    res.status(500).json({ error: err.message || 'Failed to create match' })
  }
}

// ─── GET /api/matches/live ────────────────────────────────────────────────────

export const getLiveMatches = async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      where: { status: { in: ['IN_PROGRESS', 'INNINGS_BREAK'] } },
      include: {
        team1: { select: { id: true, name: true } },
        team2: { select: { id: true, name: true } },
        innings: true,
        creator: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    res.json({ success: true, matches })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch live matches' })
  }
}

// ─── GET /api/matches/recent ──────────────────────────────────────────────────

export const getRecentMatches = async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      where: { status: 'COMPLETED' },
      include: {
        team1: { select: { id: true, name: true } },
        team2: { select: { id: true, name: true } },
        innings: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })
    res.json({ success: true, matches })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent matches' })
  }
}

// ─── GET /api/matches/:matchId ────────────────────────────────────────────────

export const getMatch = async (req, res) => {
  try {
    const match = await getMatchData(req.params.matchId)
    if (!match) return res.status(404).json({ error: 'Match not found' })
    res.json({ success: true, match })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch match' })
  }
}

// ─── POST /api/matches/:matchId/set-players ───────────────────────────────────

export const setCurrentPlayers = async (req, res) => {
  const { matchId } = req.params
  const { strikerBatsmanId, nonStrikerBatsmanId, currentBowlerId, midOverBowlerChange = false } = req.body
  const userId = req.user.id

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { innings: { orderBy: { inningNumber: 'asc' } } },
    })
    if (!match) return res.status(404).json({ error: 'Match not found' })
    if (match.createdBy !== userId)
      return res.status(403).json({ error: 'Only match creator can update players' })

    // Bowler mid-over restriction — unless this is an explicit injury/unavailability
    // replacement, in which case the new bowler continues the same over.
    const currentInning = match.innings?.find(i => i.inningNumber === match.currentInning)
    const ballsInCurrentOver = currentInning ? currentInning.legalBalls % 6 : 0
    if (
      currentBowlerId &&
      match.currentBowlerId &&
      currentBowlerId !== match.currentBowlerId &&
      ballsInCurrentOver > 0 &&
      !midOverBowlerChange
    ) {
      const remaining = 6 - ballsInCurrentOver
      return res.status(400).json({
        error: `Cannot change bowler mid-over. ${remaining} ball${remaining !== 1 ? 's' : ''} remaining in this over.`,
        code: 'MID_OVER_BOWLER_CHANGE',
      })
    }
    if (midOverBowlerChange && currentBowlerId === match.currentBowlerId) {
      return res.status(400).json({ error: 'Select a different bowler to replace the current one' })
    }

    // New-over restriction — the bowler who finished the previous over cannot
    // bowl the next over back-to-back. Only applies at the start of a fresh
    // over, not a mid-over injury/unavailability replacement.
    if (currentBowlerId && currentInning && ballsInCurrentOver === 0 && currentInning.legalBalls > 0 && !midOverBowlerChange) {
      const prevOverNumber = currentInning.legalBalls / 6
      const prevOverLastBall = await prisma.matchBall.findFirst({
        where: { inningId: currentInning.id, overNumber: prevOverNumber },
        orderBy: { createdAt: 'desc' },
      })
      if (prevOverLastBall && prevOverLastBall.bowlerId === currentBowlerId) {
        return res.status(400).json({
          error: 'This bowler bowled the last over and cannot bowl the next one.',
          code: 'CONSECUTIVE_OVER_BOWLER',
        })
      }
    }

    await prisma.match.update({
      where: { id: matchId },
      data: {
        strikerBatsmanId: strikerBatsmanId || null,
        nonStrikerBatsmanId: nonStrikerBatsmanId || null,
        currentBowlerId: currentBowlerId || null,
        status: 'IN_PROGRESS',
      },
    })

    const fullMatch = await getMatchData(matchId)
    const io = req.app.get('io')
    io.to(`match:${matchId}`).emit('match_update', fullMatch)

    res.json({ success: true, match: fullMatch })
  } catch (err) {
    console.error('setCurrentPlayers error:', err)
    res.status(500).json({ error: 'Failed to update players' })
  }
}

// ─── POST /api/matches/:matchId/ball ─────────────────────────────────────────

export const recordBall = async (req, res) => {
  const { matchId } = req.params
  const {
    runs = 0,
    extraType = null,       // 'WIDE' | 'NO_BALL' | 'LEG_BYE' | 'BYE' | null
    isWicket = false,
    wicketType = null,
    newBatsmanId = null,
    caughtById = null,
    manualStrikeChange = false,
  } = req.body

  const userId = req.user.id
  const isRetiredHurt = wicketType === 'RETIRED_HURT'

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        team1: { select: { id: true, name: true } },
        team2: { select: { id: true, name: true } },
        innings: { orderBy: { inningNumber: 'asc' } },
      },
    })

    if (!match) return res.status(404).json({ error: 'Match not found' })
    if (match.status === 'COMPLETED') return res.status(400).json({ error: 'Match already completed' })
    if (match.status === 'INNINGS_BREAK') return res.status(400).json({ error: 'Set opening players for next innings first' })
    if (match.createdBy !== userId) return res.status(403).json({ error: 'Only match creator can score' })
    if (!match.strikerBatsmanId || !match.nonStrikerBatsmanId || !match.currentBowlerId)
      return res.status(400).json({ error: 'Opening batsmen and bowler must be set first' })

    const currentInning = match.innings.find(i => i.inningNumber === match.currentInning)
    if (!currentInning) return res.status(400).json({ error: 'No active inning found' })
    if (currentInning.completed) return res.status(400).json({ error: 'Current inning is already completed' })

    const isLegal = extraType !== 'WIDE' && extraType !== 'NO_BALL'
    const isNoBall = extraType === 'NO_BALL'
    const extraPenalty = extraPenaltyFor(extraType)       // wide/no-ball add 1 penalty run
    const totalRunsThisBall = runs + extraPenalty
    // Any ball with an extraType (wide/no-ball/leg-bye/bye) is entirely "extras" —
    // none of it is credited to the batsman's individual score.
    const extrasThisBall = extraType ? totalRunsThisBall : 0
    const creditBatsman = !extraType

    const legalBalls = currentInning.legalBalls
    const overNumber = Math.floor(legalBalls / 6) + 1
    const ballNumber = isLegal ? (legalBalls % 6) + 1 : 0

    // 1 — Record the ball
    await prisma.matchBall.create({
      data: {
        inningId: currentInning.id,
        overNumber,
        ballNumber,
        batsmanId: match.strikerBatsmanId,
        bowlerId: match.currentBowlerId,
        runs,
        extras: extrasThisBall,
        extraType,
        isWicket,
        wicketType,
        caughtById: (wicketType === 'CAUGHT' && caughtById) ? caughtById : null,
        prevStrikerBatsmanId: match.strikerBatsmanId,
        prevNonStrikerBatsmanId: match.nonStrikerBatsmanId,
      },
    })

    const newLegalBalls = isLegal ? legalBalls + 1 : legalBalls
    const newWickets = currentInning.totalWickets + (isWicket && !isRetiredHurt ? 1 : 0)
    const newRuns = currentInning.totalRuns + totalRunsThisBall
    const newExtras = currentInning.extras + extrasThisBall

    // 2 — Update inning totals
    await prisma.matchInning.update({
      where: { id: currentInning.id },
      data: { totalRuns: newRuns, totalWickets: newWickets, legalBalls: newLegalBalls, extras: newExtras },
    })

    // 3 — Update batsman stats
    // Legal (incl. byes/leg-byes): counts ball faced. Plain runs (no extraType) credit
    // runs/4s/6s to the batsman. Wide/no-ball/bye/leg-bye runs are all extras — no
    // runs/boundary credit to the batsman.
    if (match.strikerBatsmanId && (isLegal || isNoBall)) {
      await prisma.matchPlayer.upsert({
        where: { matchId_userId: { matchId, userId: match.strikerBatsmanId } },
        create: {
          matchId,
          userId: match.strikerBatsmanId,
          teamId: currentInning.battingTeamId,
          runsScored: creditBatsman ? runs : 0,
          ballsFaced: isLegal ? 1 : 0,
          fours: creditBatsman && runs === 4 ? 1 : 0,
          sixes: creditBatsman && runs === 6 ? 1 : 0,
          isOut: isWicket && !isRetiredHurt,
        },
        update: {
          ...(creditBatsman && { runsScored: { increment: runs } }),
          ...(isLegal && { ballsFaced: { increment: 1 } }),
          ...(creditBatsman && runs === 4 && { fours: { increment: 1 } }),
          ...(creditBatsman && runs === 6 && { sixes: { increment: 1 } }),
          ...(isWicket && !isRetiredHurt && { isOut: true }),
        },
      })
    }

    // 4 — Update bowler stats
    if (match.currentBowlerId) {
      await prisma.matchPlayer.upsert({
        where: { matchId_userId: { matchId, userId: match.currentBowlerId } },
        create: {
          matchId,
          userId: match.currentBowlerId,
          teamId: currentInning.bowlingTeamId,
          runsConceded: totalRunsThisBall,
          legalBallsBowled: isLegal ? 1 : 0,
          wicketsTaken: (isWicket && !isRetiredHurt) ? 1 : 0,
        },
        update: {
          runsConceded: { increment: totalRunsThisBall },
          ...(isLegal && { legalBallsBowled: { increment: 1 } }),
          ...(isWicket && !isRetiredHurt && { wicketsTaken: { increment: 1 } }),
        },
      })
    }

    // 5 — Strike rotation
    const overCompleted = isLegal && newLegalBalls % 6 === 0
    const matchUpdate = {}

    if (isWicket) {
      matchUpdate.strikerBatsmanId = newBatsmanId || null
    } else if (manualStrikeChange) {
      matchUpdate.strikerBatsmanId = match.nonStrikerBatsmanId
      matchUpdate.nonStrikerBatsmanId = match.strikerBatsmanId
    } else {
      let shouldSwap = false
      if (isLegal && runs % 2 === 1) shouldSwap = !shouldSwap
      if (overCompleted) shouldSwap = !shouldSwap
      if (shouldSwap) {
        matchUpdate.strikerBatsmanId = match.nonStrikerBatsmanId
        matchUpdate.nonStrikerBatsmanId = match.strikerBatsmanId
      }
    }

    if (overCompleted) matchUpdate.currentBowlerId = null

    // 6 — Check innings completion
    const maxLegalBalls = match.totalOvers * 6
    const inning1 = match.innings.find(i => i.inningNumber === 1)
    // Chasing team wins as soon as it passes the target — match ends immediately,
    // even mid-over and with wickets in hand.
    const targetReached = match.currentInning === 2 && inning1 && newRuns > inning1.totalRuns
    const inningsOver = newWickets >= 10 || targetReached || (!match.isTest && isLegal && maxLegalBalls > 0 && newLegalBalls >= maxLegalBalls)

    if (inningsOver) {
      await prisma.matchInning.update({ where: { id: currentInning.id }, data: { completed: true } })

      if (match.currentInning === 1) {
        await prisma.matchInning.create({
          data: {
            matchId,
            inningNumber: 2,
            battingTeamId: currentInning.bowlingTeamId,
            bowlingTeamId: currentInning.battingTeamId,
          },
        })
        matchUpdate.currentInning = 2
        matchUpdate.status = 'INNINGS_BREAK'
        matchUpdate.strikerBatsmanId = null
        matchUpdate.nonStrikerBatsmanId = null
        matchUpdate.currentBowlerId = null
      } else {
        // Match complete
        const battingTeam = currentInning.battingTeamId === match.team1Id ? match.team1 : match.team2
        const bowlingTeam = currentInning.battingTeamId === match.team1Id ? match.team2 : match.team1

        let result, winnerTeamId
        if (newRuns > inning1.totalRuns) {
          const wl = 10 - newWickets
          result = `${battingTeam.name} won by ${wl} wicket${wl !== 1 ? 's' : ''}`
          winnerTeamId = battingTeam.id
        } else if (inning1.totalRuns > newRuns) {
          const diff = inning1.totalRuns - newRuns
          result = `${bowlingTeam.name} won by ${diff} run${diff !== 1 ? 's' : ''}`
          winnerTeamId = bowlingTeam.id
        } else {
          result = 'Match Tied'
          winnerTeamId = null
        }

        const { bestBatsmanId, bestBowlerId, mvpId } = await calcBestPerformers(matchId)
        matchUpdate.status = 'COMPLETED'
        matchUpdate.result = result
        matchUpdate.winnerTeamId = winnerTeamId
        matchUpdate.bestBatsmanId = bestBatsmanId
        matchUpdate.bestBowlerId = bestBowlerId
        matchUpdate.mvpId = mvpId
      }
    }

    // 7 — Update match record
    if (Object.keys(matchUpdate).length > 0) {
      await prisma.match.update({ where: { id: matchId }, data: matchUpdate })
    }

    if (matchUpdate.status === 'COMPLETED') {
      await updatePlayerCareerStats(matchId, matchUpdate.winnerTeamId)
    }

    const updatedMatch = await getMatchUpdateData(matchId, currentInning.inningNumber)
    const io = req.app.get('io')
    io.to(`match:${matchId}`).emit('match_update', updatedMatch)

    res.json({ success: true, match: updatedMatch, overCompleted, inningsOver })
  } catch (err) {
    console.error('recordBall error:', err.message, err.stack)
    res.status(500).json({ error: err.message || 'Failed to record ball' })
  }
}

// ─── POST /api/matches/:matchId/undo ─────────────────────────────────────────

export const undoLastBall = async (req, res) => {
  const { matchId } = req.params
  const userId = req.user.id

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { innings: { orderBy: { inningNumber: 'asc' } } },
    })

    if (!match) return res.status(404).json({ error: 'Match not found' })
    if (match.createdBy !== userId) return res.status(403).json({ error: 'Only match creator can undo' })

    const currentInning = match.innings.find(i => i.inningNumber === match.currentInning)
    if (!currentInning) return res.status(400).json({ error: 'No active inning' })

    const lastBall = await prisma.matchBall.findFirst({
      where: { inningId: currentInning.id },
      orderBy: { createdAt: 'desc' },
    })
    if (!lastBall) return res.status(400).json({ error: 'No balls to undo' })

    const isLegal = lastBall.extraType !== 'WIDE' && lastBall.extraType !== 'NO_BALL'
    const isNoBall = lastBall.extraType === 'NO_BALL'
    const isRetiredHurt = lastBall.wicketType === 'RETIRED_HURT'
    const extraPenalty = extraPenaltyFor(lastBall.extraType)
    const totalRuns = lastBall.runs + extraPenalty
    const creditBatsman = !lastBall.extraType

    await prisma.matchBall.delete({ where: { id: lastBall.id } })

    await prisma.matchInning.update({
      where: { id: currentInning.id },
      data: {
        totalRuns: { decrement: totalRuns },
        totalWickets: (lastBall.isWicket && !isRetiredHurt) ? { decrement: 1 } : undefined,
        legalBalls: isLegal ? { decrement: 1 } : undefined,
        extras: { decrement: lastBall.extras },
      },
    })

    if (lastBall.batsmanId && (isLegal || isNoBall)) {
      await prisma.matchPlayer.update({
        where: { matchId_userId: { matchId, userId: lastBall.batsmanId } },
        data: {
          ...(creditBatsman && { runsScored: { decrement: lastBall.runs } }),
          ...(isLegal && { ballsFaced: { decrement: 1 } }),
          ...(creditBatsman && lastBall.runs === 4 && { fours: { decrement: 1 } }),
          ...(creditBatsman && lastBall.runs === 6 && { sixes: { decrement: 1 } }),
          ...(lastBall.isWicket && !isRetiredHurt && { isOut: false }),
        },
      })
    }

    if (lastBall.bowlerId) {
      await prisma.matchPlayer.update({
        where: { matchId_userId: { matchId, userId: lastBall.bowlerId } },
        data: {
          runsConceded: { decrement: totalRuns },
          ...(isLegal && { legalBallsBowled: { decrement: 1 } }),
          ...(lastBall.isWicket && !isRetiredHurt && { wicketsTaken: { decrement: 1 } }),
        },
      })
    }

    // Restore striker/non-striker/bowler to whatever they were before this
    // ball — undoes wicket replacements, strike rotations and over-end
    // bowler resets in one go.
    await prisma.match.update({
      where: { id: matchId },
      data: {
        strikerBatsmanId: lastBall.prevStrikerBatsmanId ?? lastBall.batsmanId,
        nonStrikerBatsmanId: lastBall.prevNonStrikerBatsmanId ?? match.nonStrikerBatsmanId,
        currentBowlerId: lastBall.bowlerId,
      },
    })

    const updatedMatch = await getMatchUpdateData(matchId, currentInning.inningNumber)
    const io = req.app.get('io')
    io.to(`match:${matchId}`).emit('match_update', updatedMatch)

    res.json({ success: true, match: updatedMatch })
  } catch (err) {
    console.error('undoLastBall error:', err.message, err.stack)
    res.status(500).json({ error: err.message || 'Failed to undo' })
  }
}

// ─── POST /api/matches/:matchId/abandon ──────────────────────────────────────

export const abandonMatch = async (req, res) => {
  const { matchId } = req.params
  const userId = req.user.id
  const { winnerTeamId, reason } = req.body

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { team1: true, team2: true },
    })
    if (!match) return res.status(404).json({ error: 'Match not found' })
    if (match.createdBy !== userId) return res.status(403).json({ error: 'Only match creator can end this match' })
    if (match.status === 'COMPLETED') return res.status(400).json({ error: 'Match already completed' })

    let result
    if (winnerTeamId) {
      if (![match.team1Id, match.team2Id].includes(winnerTeamId)) {
        return res.status(400).json({ error: 'Invalid team' })
      }
      const winnerTeam = winnerTeamId === match.team1Id ? match.team1 : match.team2
      result = `${winnerTeam.name} won${reason ? ` (${reason})` : ' (Match Abandoned)'}`
    } else {
      result = `Match Abandoned${reason ? ` - ${reason}` : ' - No Result'}`
    }

    await prisma.match.update({
      where: { id: matchId },
      data: { status: 'COMPLETED', result, winnerTeamId: winnerTeamId || null },
    })

    await updatePlayerCareerStats(matchId, winnerTeamId || null)

    const updatedMatch = await getMatchUpdateData(matchId, match.currentInning)
    const io = req.app.get('io')
    io.to(`match:${matchId}`).emit('match_update', updatedMatch)

    res.json({ success: true, match: updatedMatch })
  } catch (err) {
    console.error('abandonMatch error:', err.message, err.stack)
    res.status(500).json({ error: err.message || 'Failed to abandon match' })
  }
}
