import prisma from '../lib/prisma.js'

// Keeps the better of two bowling spells: more wickets first, then fewer runs conceded.
export function pickBestBowling(prev, current) {
  if (!current) return prev || null
  if (!prev) return current
  if (current.wickets !== prev.wickets) return current.wickets > prev.wickets ? current : prev
  return current.runs < prev.runs ? current : prev
}

// Merges one match's batting/bowling tallies into a stats bucket (overall or per-format).
export function rollUpStats(prev, p) {
  return {
    runs: (prev.runs || 0) + p.runsScored,
    balls: (prev.balls || 0) + p.ballsFaced,
    fours: (prev.fours || 0) + p.fours,
    sixes: (prev.sixes || 0) + p.sixes,
    wickets: (prev.wickets || 0) + p.wicketsTaken,
    runsConceded: (prev.runsConceded || 0) + p.runsConceded,
    ballsBowled: (prev.ballsBowled || 0) + p.legalBallsBowled,
    highScore: Math.max(prev.highScore || 0, p.runsScored),
    fifties: (prev.fifties || 0) + (p.runsScored >= 50 && p.runsScored < 100 ? 1 : 0),
    hundreds: (prev.hundreds || 0) + (p.runsScored >= 100 ? 1 : 0),
    bestBowling: p.legalBallsBowled > 0
      ? pickBestBowling(prev.bestBowling || null, { wickets: p.wicketsTaken, runs: p.runsConceded })
      : (prev.bestBowling || null),
  }
}

// Computes a player's full cricket career stats (overall + per format/ball-type) directly
// from completed matches, so the result is always accurate regardless of when those
// matches were played or whether UserSport.stats was kept up to date at the time.
export async function computeCricketCareerStats(userId) {
  const matchPlayers = await prisma.matchPlayer.findMany({
    where: { userId, match: { status: 'COMPLETED' } },
    include: { match: { select: { matchFormat: true, ballType: true, winnerTeamId: true } } },
  })

  let overall = {}
  const formats = {}
  let matchesPlayed = 0
  let matchesWon = 0

  for (const p of matchPlayers) {
    matchesPlayed += 1
    const won = !!(p.match.winnerTeamId && p.teamId === p.match.winnerTeamId)
    if (won) matchesWon += 1

    overall = rollUpStats(overall, p)

    const formatKey = `${p.match.matchFormat || 'CUSTOM'}_${p.match.ballType || 'LEATHER'}`
    const prevFormatStats = formats[formatKey] || {}
    formats[formatKey] = {
      ...rollUpStats(prevFormatStats, p),
      matchesPlayed: (prevFormatStats.matchesPlayed || 0) + 1,
      matchesWon: (prevFormatStats.matchesWon || 0) + (won ? 1 : 0),
    }
  }

  return { matchesPlayed, matchesWon, stats: { ...overall, formats } }
}
