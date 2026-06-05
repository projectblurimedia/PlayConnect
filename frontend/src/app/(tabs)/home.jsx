import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text as RNText, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSelector } from 'react-redux'
import { useRouter } from 'expo-router'
import { getNearbyGrounds, getNearbyPlayers } from '../../services/api'

const ACCENT = '#C8102E'

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

const SPORT_EMOJI = { CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', BADMINTON: '🏸', VOLLEYBALL: '🏐', KABADDI: '🤼', TENNIS: '🎾', OTHER: '🏃' }

const QUICK_ACTIONS = [
  { icon: 'people', label: 'Find Players', color: '#4f46e5', route: '/search' },
  { icon: 'location', label: 'Find Venues', color: '#0891b2', route: '/search' },
  { icon: 'trophy', label: 'Challenges', color: ACCENT, route: '/challenges' },
  { icon: 'add-circle', label: 'Create Match', color: '#059669', route: '/create-match' },
]

function PlayerCard({ player, onPress, isDark }) {
  const initials = (player.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const sport = player.sports?.[0]
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const nameColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'

  return (
    <TouchableOpacity style={[styles.playerCard, { backgroundColor: cardBg }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.playerAvatarContainer}>
        {player.profilePhotoUrl
          ? <Image source={{ uri: player.profilePhotoUrl }} style={styles.playerAvatar} />
          : (
            <View style={styles.playerAvatarFallback}>
              <Text style={styles.playerAvatarText}>{initials}</Text>
            </View>
          )
        }
        {sport && (
          <View style={styles.sportDot}>
            <Text style={{ fontSize: 11 }}>{SPORT_EMOJI[sport.sport] || '🏃'}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.playerName, { color: nameColor }]} numberOfLines={1}>{player.fullName}</Text>
      <Text style={[styles.playerHandle, { color: mutedColor }]} numberOfLines={1}>@{player.username}</Text>
      {sport && (
        <View style={styles.sportChip}>
          <Text style={styles.sportChipText}>{sport.sport}</Text>
        </View>
      )}
      <View style={styles.playerFooter}>
        <Ionicons name="location-outline" size={10} color="#999" />
        <Text style={[styles.playerCity, { color: mutedColor }]} numberOfLines={1}> {player.city}</Text>
      </View>
    </TouchableOpacity>
  )
}

function GroundCard({ ground, onPress, isDark }) {
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const nameColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'

  return (
    <TouchableOpacity style={[styles.groundCard, { backgroundColor: cardBg }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.groundImgWrap}>
        {ground.photos?.[0]
          ? <Image source={{ uri: ground.photos[0] }} style={styles.groundImg} />
          : (
            <View style={[styles.groundImgFallback, { backgroundColor: isDark ? '#2a2a2a' : '#f5f0f0' }]}>
              <Ionicons name="location" size={36} color={ACCENT + '55'} />
              <Text style={{ fontSize: 11, color: '#bbb', marginTop: 4, fontFamily: 'Poppins_500Medium' }}>No Photo</Text>
            </View>
          )
        }
        <View style={styles.groundPriceBadge}>
          <Text style={styles.groundPriceText}>₹{ground.pricePerHour}/hr</Text>
        </View>
        {ground.isVerified && (
          <View style={styles.groundVerifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
            <Text style={styles.groundVerifiedText}>Verified</Text>
          </View>
        )}
      </View>
      <View style={styles.groundInfo}>
        <Text style={[styles.groundName, { color: nameColor }]} numberOfLines={1}>{ground.name}</Text>
        <View style={styles.groundMetaRow}>
          <Ionicons name="location-outline" size={12} color="#888" />
          <Text style={[styles.groundCity, { color: mutedColor }]} numberOfLines={1}> {ground.city}, {ground.state}</Text>
        </View>
        {(ground.supportedSports || []).length > 0 && (
          <View style={styles.groundSports}>
            {(ground.supportedSports).slice(0, 5).map(s => (
              <Text key={s} style={styles.groundSportEmoji}>{SPORT_EMOJI[s] || '🏃'}</Text>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function HomeScreen() {
  const user = useSelector(state => state.user.user)
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()

  const [players, setPlayers] = useState([])
  const [grounds, setGrounds] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [loadingGrounds, setLoadingGrounds] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const bg = isDark ? '#111' : '#efefef'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#666'

  const fetchData = useCallback(async () => {
    setLoadingPlayers(true)
    setLoadingGrounds(true)
    try {
      const [pl, gr] = await Promise.all([
        getNearbyPlayers({ city: user?.city, state: user?.state }).catch(() => ({ players: [] })),
        getNearbyGrounds({ city: user?.city, state: user?.state }).catch(() => ({ grounds: [] })),
      ])
      setPlayers(pl.players || [])
      setGrounds(gr.grounds || [])
    } finally {
      setLoadingPlayers(false)
      setLoadingGrounds(false)
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
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

      {/* Players Near You */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>PLAYERS NEAR YOU</Text>
        <TouchableOpacity onPress={() => router.push('/search')}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>
      {loadingPlayers
        ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
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
        ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
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
          : grounds.map(g => (
            <GroundCard key={g.id} ground={g} isDark={isDark} onPress={() => {}} />
          ))
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

  // ── Player card ──
  hScroll: { paddingRight: 8, paddingBottom: 20, gap: 12 },
  playerCard: {
    width: 138,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  playerAvatarContainer: { position: 'relative', marginBottom: 8 },
  playerAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: ACCENT + '40' },
  playerAvatarFallback: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: ACCENT + '80',
  },
  playerAvatarText: { color: '#fff', fontSize: 20, fontFamily: 'Poppins_700Bold' },
  sportDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3,
  },
  playerName: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', textAlign: 'center', marginBottom: 1 },
  playerHandle: { fontSize: 10.5, textAlign: 'center', marginBottom: 6 },
  sportChip: {
    backgroundColor: ACCENT + '15',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  sportChipText: { fontSize: 9.5, color: ACCENT, fontFamily: 'Poppins_600SemiBold' },
  playerFooter: { flexDirection: 'row', alignItems: 'center' },
  playerCity: { fontSize: 10, textAlign: 'center' },

  // ── Ground card ──
  groundCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  groundImgWrap: { position: 'relative', height: 160 },
  groundImg: { width: '100%', height: '100%' },
  groundImgFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  groundPriceBadge: {
    position: 'absolute', bottom: 10, left: 12,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  groundPriceText: { color: '#fff', fontSize: 12, fontFamily: 'Poppins_700Bold' },
  groundVerifiedBadge: {
    position: 'absolute', top: 10, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  groundVerifiedText: { fontSize: 10, color: '#22c55e', fontFamily: 'Poppins_600SemiBold' },
  groundInfo: { padding: 14 },
  groundName: { fontSize: 15, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  groundMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  groundCity: { fontSize: 12 },
  groundSports: { flexDirection: 'row', gap: 4 },
  groundSportEmoji: { fontSize: 16 },
})
