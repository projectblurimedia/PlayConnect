import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text as RNText, ScrollView, StyleSheet, TouchableOpacity,
  Image, Animated, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSelector } from 'react-redux'
import { useRouter } from 'expo-router'
import { getNearbyGrounds, getNearbyPlayers, getLiveMatches } from '../../services/api'

const ACCENT = '#C8102E'

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

const SPORT_EMOJI = { CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', BADMINTON: '🏸', VOLLEYBALL: '🏐', KABADDI: '🤼', TENNIS: '🎾', OTHER: '🏃' }

const SKILL_COLOR = {
  Beginner: '#22c55e',
  Intermediate: '#f59e0b',
  Advanced: '#0891b2',
  Professional: ACCENT,
}

const QUICK_ACTIONS = [
  { icon: 'people', label: 'Find Players', color: '#4f46e5', route: '/search' },
  { icon: 'location', label: 'Find Venues', color: '#0891b2', route: '/search' },
  { icon: 'trophy', label: 'Challenges', color: ACCENT, route: '/challenges' },
  { icon: 'add-circle', label: 'Create Match', color: '#059669', route: '/create-match' },
]

function PlayerCard({ player, onPress, isDark }) {
  const initials = (player.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const sport = player.sports?.[0]
  const skillColor = SKILL_COLOR[sport?.skillLevel] || ACCENT
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const nameColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'

  return (
    <TouchableOpacity style={[styles.playerCard, { backgroundColor: cardBg }]} onPress={onPress} activeOpacity={0.88}>
      <LinearGradient
        colors={[ACCENT, '#8a0c20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.playerCardHeader}
      >
        <Text style={styles.playerSportEmoji}>{SPORT_EMOJI[sport?.sport] || '🏃'}</Text>
      </LinearGradient>

      <View style={styles.playerCardBody}>
        <View style={styles.playerAvatarContainer}>
          {player.profilePhotoUrl
            ? <Image source={{ uri: player.profilePhotoUrl }} style={[styles.playerAvatar, { borderColor: cardBg }]} />
            : (
              <View style={[styles.playerAvatarFallback, { borderColor: cardBg, backgroundColor: skillColor }]}>
                <Text style={styles.playerAvatarText}>{initials}</Text>
              </View>
            )
          }
        </View>
        <Text style={[styles.playerName, { color: nameColor }]} numberOfLines={1}>{player.fullName}</Text>
        <Text style={[styles.playerHandle, { color: mutedColor }]} numberOfLines={1}>@{player.username}</Text>
        {sport?.preferredRole && (
          <View style={[styles.roleChip, { backgroundColor: skillColor + '15' }]}>
            <Text style={[styles.roleChipText, { color: skillColor }]} numberOfLines={1}>{sport.preferredRole}</Text>
          </View>
        )}
        <View style={[styles.playerFooter, { borderTopColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
          <Ionicons name="location-outline" size={11} color={mutedColor} />
          <Text style={[styles.playerCity, { color: mutedColor }]} numberOfLines={1}> {player.city}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function GroundCard({ ground, onPress, isDark }) {
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const nameColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'

  return (
    <TouchableOpacity style={[styles.groundCard, { backgroundColor: cardBg }]} onPress={onPress} activeOpacity={0.88}>
      <LinearGradient
        colors={[ACCENT, '#8a0c20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.groundCardHeader}
      >
        <Text style={styles.groundTypeTagText} numberOfLines={1}>
          {ground.groundType === 'OPEN' ? '🌤️ Open Ground' : '🌱 Turf'}
        </Text>
        <Text style={styles.groundHeaderSportEmoji}>
          {SPORT_EMOJI[(ground.supportedSports || [])[0]] || '🏃'}
        </Text>
      </LinearGradient>

      <View style={styles.groundImgWrap}>
        {ground.photos?.[0]
          ? <Image source={{ uri: ground.photos[0] }} style={styles.groundImg} />
          : (
            <View style={[styles.groundImgFallback, { backgroundColor: isDark ? '#2a2a2a' : '#f5f0f0' }]}>
              <Ionicons name="location" size={32} color={ACCENT + '55'} />
            </View>
          )
        }
        <View style={styles.groundPriceBadge}>
          <Text style={styles.groundPriceText}>₹{ground.pricePerHour}/hr</Text>
        </View>
        {ground.isVerified && (
          <View style={styles.groundVerifiedBadgeImg}>
            <Ionicons name="checkmark-circle" size={12} color="#4ade80" />
            <Text style={styles.groundVerifiedText}>Verified</Text>
          </View>
        )}
      </View>

      <View style={styles.groundInfo}>
        <Text style={[styles.groundName, { color: nameColor }]} numberOfLines={1}>{ground.name}</Text>
        <View style={styles.groundMetaRow}>
          <Ionicons name="location-outline" size={11} color={mutedColor} />
          <Text style={[styles.groundCity, { color: mutedColor }]} numberOfLines={1}> {ground.city}, {ground.state}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function LiveMatchCard({ match, onPress, isDark }) {
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'
  const scoreBg = isDark ? '#2a1014' : '#fdedf0'

  const inning1 = match.innings?.find(i => i.inningNumber === 1)
  const currentInning = match.innings?.find(i => i.inningNumber === match.currentInning)
  const battingTeamName = currentInning?.battingTeamId === match.team1Id ? match.team1?.name : match.team2?.name
  const overs = currentInning ? `${Math.floor(currentInning.legalBalls / 6)}.${currentInning.legalBalls % 6}` : '0.0'
  const crr = currentInning?.legalBalls > 0
    ? (currentInning.totalRuns / (currentInning.legalBalls / 6)).toFixed(2)
    : '0.00'

  const team1Initial = (match.team1?.name || '?')[0]?.toUpperCase()
  const team2Initial = (match.team2?.name || '?')[0]?.toUpperCase()

  const showPrevInnings = match.currentInning === 2 && inning1 && inning1.id !== currentInning?.id
  const inning1TeamName = inning1?.battingTeamId === match.team1Id ? match.team1?.name : match.team2?.name
  const inning1Overs = inning1 ? `${Math.floor(inning1.legalBalls / 6)}.${inning1.legalBalls % 6}` : '0.0'

  const target = showPrevInnings ? inning1.totalRuns + 1 : null
  const needRuns = target != null && currentInning ? target - currentInning.totalRuns : null

  // While the 1st innings is still in progress, the other team hasn't batted yet
  const yetToBatTeamName = match.currentInning === 1
    ? (currentInning?.battingTeamId === match.team1Id ? match.team2?.name : match.team1?.name)
    : null

  return (
    <TouchableOpacity style={[styles.matchCard, { backgroundColor: cardBg }]} onPress={onPress} activeOpacity={0.88}>
      <LinearGradient
        colors={[ACCENT, '#8a0c20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.matchCardHeader}
      >
        <View style={styles.liveBadge}>
          <View style={styles.liveBadgeDot} />
          <Text style={styles.liveBadgeText}>{match.status === 'IN_PROGRESS' ? 'LIVE' : 'BREAK'}</Text>
        </View>
        <Text style={styles.matchFormatText} numberOfLines={1}>
          {match.isTest ? 'Test' : `${match.totalOvers} over${match.totalOvers === 1 ? '' : 's'}`} · {match.matchFormat}
        </Text>
      </LinearGradient>

      <View style={styles.matchCardBody}>
        <View style={styles.matchTeamsRow}>
          <View style={styles.matchTeamCol}>
            <View style={[styles.teamAvatar, { backgroundColor: ACCENT + '18' }]}>
              <Text style={[styles.teamAvatarText, { color: ACCENT }]}>{team1Initial}</Text>
            </View>
            <Text style={[styles.matchTeamName, { color: textColor }]} numberOfLines={1}>{match.team1?.name}</Text>
          </View>
          <Text style={[styles.matchVs, { color: mutedColor }]}>VS</Text>
          <View style={styles.matchTeamCol}>
            <View style={[styles.teamAvatar, { backgroundColor: '#0891b218' }]}>
              <Text style={[styles.teamAvatarText, { color: '#0891b2' }]}>{team2Initial}</Text>
            </View>
            <Text style={[styles.matchTeamName, { color: textColor }]} numberOfLines={1}>{match.team2?.name}</Text>
          </View>
        </View>

        {currentInning && (
          <View style={[styles.matchScoreSection, { borderTopColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
            <View style={[styles.matchScoreHighlight, { backgroundColor: scoreBg }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.matchScoreTeam, { color: mutedColor }]} numberOfLines={1}>{battingTeamName}</Text>
                <Text style={styles.matchScoreBig} numberOfLines={1}>
                  {currentInning.totalRuns}<Text style={styles.matchScoreWickets}>/{currentInning.totalWickets}</Text>
                  <Text style={[styles.matchOversText, { color: mutedColor }]}>  ({overs})</Text>
                </Text>
                <Text style={[styles.matchOversText, { color: mutedColor }]} numberOfLines={1}>
                  CRR {crr}{needRuns != null ? `  ·  Need ${Math.max(needRuns, 0)} to win` : ''}
                </Text>
              </View>
              <View style={styles.watchBtn}>
                <Ionicons name="play" size={12} color="#fff" />
              </View>
            </View>
            {showPrevInnings && (
              <Text style={[styles.prevInningsText, { color: mutedColor, marginBottom: 0, marginTop: 6 }]} numberOfLines={1}>
                {inning1TeamName} <Text style={{ fontFamily: 'Poppins_700Bold' }}>{inning1.totalRuns}/{inning1.totalWickets}</Text> ({inning1Overs} ov)
              </Text>
            )}
            {yetToBatTeamName && (
              <Text style={[styles.prevInningsText, { color: mutedColor, marginBottom: 0, marginTop: 6 }]} numberOfLines={1}>
                {yetToBatTeamName} · <Text style={{ fontFamily: 'Poppins_700Bold' }}>Yet to bat</Text>
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

function useSkeletonPulse() {
  const opacity = useRef(new Animated.Value(0.35)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])
  return opacity
}

function SkeletonBox({ width, height, radius = 8, style, isDark, opacity }) {
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: isDark ? '#333' : '#e2e2e2', opacity },
        style,
      ]}
    />
  )
}

function SkeletonPlayerCard({ isDark }) {
  const opacity = useSkeletonPulse()
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const headerBg = isDark ? '#2a2a2a' : '#ececec'
  return (
    <View style={[styles.playerCard, { backgroundColor: cardBg }]}>
      <View style={[styles.playerCardHeader, { backgroundColor: headerBg }]} />
      <View style={styles.playerCardBody}>
        <SkeletonBox width={64} height={64} radius={32} isDark={isDark} opacity={opacity} style={{ marginTop: -28, marginBottom: 8, borderWidth: 4, borderColor: cardBg }} />
        <SkeletonBox width={84} height={12} radius={4} isDark={isDark} opacity={opacity} style={{ marginBottom: 6 }} />
        <SkeletonBox width={56} height={10} radius={4} isDark={isDark} opacity={opacity} style={{ marginBottom: 10 }} />
        <SkeletonBox width="100%" height={20} radius={4} isDark={isDark} opacity={opacity} />
      </View>
    </View>
  )
}

function SkeletonGroundCard({ isDark }) {
  const opacity = useSkeletonPulse()
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const headerBg = isDark ? '#3a1218' : '#f1c9d0'
  return (
    <View style={[styles.groundCard, { backgroundColor: cardBg }]}>
      <View style={[styles.groundCardHeader, { backgroundColor: headerBg }]} />
      <SkeletonBox width="100%" height={100} radius={0} isDark={isDark} opacity={opacity} />
      <View style={styles.groundInfo}>
        <SkeletonBox width="50%" height={10} radius={4} isDark={isDark} opacity={opacity} style={{ marginBottom: 12 }} />
        <SkeletonBox width="85%" height={12} radius={4} isDark={isDark} opacity={opacity} style={{ marginBottom: 8 }} />
      </View>
    </View>
  )
}

function SkeletonMatchCard({ isDark }) {
  const opacity = useSkeletonPulse()
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const headerBg = isDark ? '#3a1218' : '#f1c9d0'
  return (
    <View style={[styles.matchCard, { backgroundColor: cardBg }]}>
      <View style={[styles.matchCardHeader, { backgroundColor: headerBg }]}>
        <SkeletonBox width={48} height={16} radius={8} isDark={isDark} opacity={opacity} />
        <SkeletonBox width={64} height={12} radius={4} isDark={isDark} opacity={opacity} />
      </View>
      <View style={styles.matchCardBody}>
        <View style={styles.matchTeamsRow}>
          <View style={styles.matchTeamCol}>
            <SkeletonBox width={40} height={40} radius={20} isDark={isDark} opacity={opacity} />
            <SkeletonBox width={50} height={10} radius={4} isDark={isDark} opacity={opacity} />
          </View>
          <SkeletonBox width={20} height={10} radius={4} isDark={isDark} opacity={opacity} />
          <View style={styles.matchTeamCol}>
            <SkeletonBox width={40} height={40} radius={20} isDark={isDark} opacity={opacity} />
            <SkeletonBox width={50} height={10} radius={4} isDark={isDark} opacity={opacity} />
          </View>
        </View>
        <View style={[styles.matchScoreSection, { borderTopColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
          <SkeletonBox width="100%" height={56} radius={12} isDark={isDark} opacity={opacity} />
        </View>
      </View>
    </View>
  )
}

export default function HomeScreen() {
  const user = useSelector(state => state.user.user)
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()

  const [players, setPlayers] = useState([])
  const [grounds, setGrounds] = useState([])
  const [liveMatches, setLiveMatches] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [loadingGrounds, setLoadingGrounds] = useState(false)
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const bg = isDark ? '#111' : '#efefef'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#666'

  const fetchData = useCallback(async () => {
    setLoadingPlayers(true)
    setLoadingGrounds(true)
    setLoadingMatches(true)
    try {
      const [pl, gr, lm] = await Promise.all([
        getNearbyPlayers({ city: user?.city, state: user?.state }).catch(() => ({ players: [] })),
        getNearbyGrounds({ city: user?.city, state: user?.state }).catch(() => ({ grounds: [] })),
        getLiveMatches().catch(() => ({ matches: [] })),
      ])
      setPlayers(pl.players || [])
      setGrounds(gr.grounds || [])
      setLiveMatches(lm.matches || [])
    } finally {
      setLoadingPlayers(false)
      setLoadingGrounds(false)
      setLoadingMatches(false)
    }
  }, [user?.city, user?.state])

  useEffect(() => { fetchData() }, [fetchData])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const firstName = user?.fullName?.split(' ')[0] || 'Champ'

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT, '#FF6B35', '#7C3AED']} progressBackgroundColor="#fff" />}
    >
      {/* Greeting */}
      <View style={[styles.greetCard, { backgroundColor: cardBg }]}>
        <View style={styles.greetLeft}>
          <Text style={[styles.greetHi, { color: mutedColor }]}>Good day,</Text>
          <Text style={[styles.greetName, { color: textColor }]}>{firstName}! 👋</Text>
          <Text style={[styles.greetSub, { color: mutedColor }]}>Ready for your next real battle?</Text>
        </View>
        <View style={styles.greetBadge}>
          <Text style={styles.greetBadgeEmoji}>🏆</Text>
        </View>
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map(item => (
          <TouchableOpacity
            key={item.label}
            style={[styles.actionCard, { backgroundColor: cardBg }]}
            onPress={() => router.push(item.route)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBg, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={[styles.actionLabel, { color: isDark ? '#ddd' : '#222' }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Live Matches Near You */}
      {(loadingMatches || liveMatches.length > 0) && (
        <>
          <Text style={styles.sectionLabel}>LIVE MATCHES NEAR YOU</Text>
          {loadingMatches
            ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                {[1, 2].map(i => <SkeletonMatchCard key={i} isDark={isDark} />)}
              </ScrollView>
            )
            : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                {liveMatches.map(m => (
                  <LiveMatchCard key={m.id} match={m} isDark={isDark} onPress={() => router.push(`/match-scoring/${m.id}`)} />
                ))}
              </ScrollView>
            )}
        </>
      )}

      {/* Players Near You */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>PLAYERS NEAR YOU</Text>
        <TouchableOpacity onPress={() => router.push('/search')}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>
      {loadingPlayers
        ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {[1, 2, 3].map(i => <SkeletonPlayerCard key={i} isDark={isDark} />)}
          </ScrollView>
        )
        : players.length === 0
          ? (
            <View style={[styles.emptyBox, { backgroundColor: cardBg }]}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="people-outline" size={30} color={ACCENT} />
              </View>
              <Text style={[styles.emptyTitle, { color: textColor }]}>No players found nearby</Text>
              <Text style={[styles.emptyHint, { color: mutedColor }]}>Try expanding your area in search</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/search')}>
                <Text style={styles.emptyBtnText}>Search Players</Text>
              </TouchableOpacity>
            </View>
          )
          : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {players.map(p => (
                <PlayerCard key={p.id} player={p} isDark={isDark} onPress={() => router.push(`/player/${p.id}`)} />
              ))}
            </ScrollView>
          )
      }

      {/* Venues Near You */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>VENUES NEAR YOU</Text>
        <TouchableOpacity onPress={() => router.push('/search')}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>
      {loadingGrounds
        ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {[1, 2, 3].map(i => <SkeletonGroundCard key={i} isDark={isDark} />)}
          </ScrollView>
        )
        : grounds.length === 0
          ? (
            <View style={[styles.emptyBox, { backgroundColor: cardBg }]}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="location-outline" size={30} color={ACCENT} />
              </View>
              <Text style={[styles.emptyTitle, { color: textColor }]}>No venues found nearby</Text>
              <Text style={[styles.emptyHint, { color: mutedColor }]}>Be the first to register a venue</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/register-venue')}>
                <Text style={styles.emptyBtnText}>Register Venue</Text>
              </TouchableOpacity>
            </View>
          )
          : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {grounds.map(g => (
                <GroundCard key={g.id} ground={g} isDark={isDark} onPress={() => router.push(`/ground/${g.id}`)} />
              ))}
            </ScrollView>
          )
      }
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },

  // ── Greeting card ──
  greetCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  greetLeft: { flex: 1 },
  greetHi: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginBottom: 1 },
  greetName: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 2 },
  greetSub: { fontSize: 11.5, fontFamily: 'Poppins_400Regular' },
  greetBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: ACCENT + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetBadgeEmoji: { fontSize: 26 },

  // ── Section labels ──
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: ACCENT,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  seeAll: { fontSize: 12, color: ACCENT, fontFamily: 'Poppins_600SemiBold' },

  // ── Quick actions ──
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    minWidth: '44%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: { fontSize: 12.5, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },

  // ── Empty state ──
  emptyBox: {
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconBg: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: ACCENT + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', marginBottom: 4 },
  emptyHint: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  emptyBtn: {
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 9,
    backgroundColor: ACCENT,
    borderRadius: 22,
  },
  emptyBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },

  // ── Live match card ──
  matchCard: {
    width: 250,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  matchCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 9,
  },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  liveBadgeText: { fontSize: 10, fontFamily: 'Poppins_700Bold', color: '#fff', letterSpacing: 0.5 },
  matchFormatText: { fontSize: 10.5, fontFamily: 'Poppins_600SemiBold', color: 'rgba(255,255,255,0.9)' },
  matchCardBody: { padding: 14 },
  matchTeamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  matchTeamCol: { flex: 1, alignItems: 'center', gap: 6 },
  teamAvatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  teamAvatarText: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  matchTeamName: { fontSize: 11.5, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  matchVs: { fontSize: 10, fontFamily: 'Poppins_700Bold', marginHorizontal: 6 },
  matchScoreSection: { paddingTop: 10, borderTopWidth: 1 },
  prevInningsText: { fontSize: 10.5, fontFamily: 'Poppins_500Medium', marginBottom: 6 },
  matchScoreHighlight: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
  },
  matchScoreTeam: { fontSize: 10.5, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  matchScoreBig: { fontSize: 21, fontFamily: 'Poppins_800ExtraBold', color: ACCENT },
  matchScoreWickets: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: ACCENT },
  matchOversText: { fontSize: 10.5, fontFamily: 'Poppins_500Medium', marginTop: 2 },
  watchBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: ACCENT,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 8,
  },

  // ── Player card ──
  hScroll: { paddingRight: 8, paddingBottom: 20, gap: 12 },
  playerCard: {
    width: 152,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  playerCardHeader: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  playerSportEmoji: { fontSize: 20 },
  playerCardBody: { padding: 12, paddingTop: 0, alignItems: 'center' },
  playerAvatarContainer: { marginTop: -28, marginBottom: 8 },
  playerAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 4 },
  playerAvatarFallback: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4,
  },
  playerAvatarText: { color: '#fff', fontSize: 21, fontFamily: 'Poppins_700Bold' },
  playerName: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', textAlign: 'center', marginBottom: 1 },
  playerHandle: { fontSize: 10.5, textAlign: 'center', marginBottom: 8 },
  roleChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
    maxWidth: '100%',
  },
  roleChipText: { fontSize: 10, fontFamily: 'Poppins_600SemiBold' },
  playerFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 1, paddingTop: 8, width: '100%',
  },
  playerCity: { fontSize: 10, textAlign: 'center' },

  // ── Ground card ──
  groundCard: {
    width: 210,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  groundCardHeader: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  groundTypeTagText: { fontSize: 10.5, fontFamily: 'Poppins_600SemiBold', color: '#fff', flex: 1 },
  groundImgWrap: { position: 'relative', height: 100 },
  groundImg: { width: '100%', height: '100%' },
  groundImgFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  groundPriceBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  groundPriceText: { color: '#fff', fontSize: 11, fontFamily: 'Poppins_700Bold' },
  groundVerifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  groundVerifiedBadgeImg: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  groundVerifiedText: { fontSize: 9.5, color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  groundHeaderSportEmoji: { fontSize: 16 },
  groundInfo: { padding: 12 },
  groundName: { fontSize: 14, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  groundMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  groundCity: { fontSize: 11.5 },
})
