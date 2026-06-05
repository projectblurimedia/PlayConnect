import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text as RNText, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useRouter } from 'expo-router'
import { getNearbyGrounds, getNearbyPlayers } from '../../services/api'

const ACCENT = '#C8102E'

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

const SPORT_EMOJI = { CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', BADMINTON: '🏸', VOLLEYBALL: '🏐', KABADDI: '🤼', TENNIS: '🎾', OTHER: '🏃' }

function PlayerCard({ player, onPress, isDark }) {
  const initials = (player.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const nameColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'
  const sport = player.sports?.[0]

  return (
    <TouchableOpacity style={[styles.playerCard, { backgroundColor: cardBg }]} onPress={onPress} activeOpacity={0.8}>
      {player.profilePhotoUrl
        ? <Image source={{ uri: player.profilePhotoUrl }} style={styles.playerAvatar} />
        : <View style={styles.playerAvatarFallback}><Text style={styles.playerAvatarText}>{initials}</Text></View>
      }
      <Text style={[styles.playerName, { color: nameColor }]} numberOfLines={1}>{player.fullName}</Text>
      <Text style={[styles.playerHandle, { color: mutedColor }]} numberOfLines={1}>@{player.username}</Text>
      {sport && (
        <View style={styles.sportBadge}>
          <Text style={styles.sportEmoji}>{SPORT_EMOJI[sport.sport] || '🏃'}</Text>
          <Text style={styles.sportBadgeText}>{sport.sport}</Text>
        </View>
      )}
      <Text style={[styles.playerCity, { color: mutedColor }]} numberOfLines={1}>
        <Ionicons name="location-outline" size={11} /> {player.city}
      </Text>
    </TouchableOpacity>
  )
}

function GroundCard({ ground, onPress, isDark }) {
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const nameColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'

  return (
    <TouchableOpacity style={[styles.groundCard, { backgroundColor: cardBg }]} onPress={onPress} activeOpacity={0.8}>
      {ground.photos?.[0]
        ? <Image source={{ uri: ground.photos[0] }} style={styles.groundImg} />
        : <View style={[styles.groundImgFallback, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
            <Ionicons name="location" size={28} color="#ccc" />
          </View>
      }
      <View style={styles.groundInfo}>
        <Text style={[styles.groundName, { color: nameColor }]} numberOfLines={1}>{ground.name}</Text>
        <Text style={[styles.groundCity, { color: mutedColor }]} numberOfLines={1}>
          <Ionicons name="location-outline" size={11} /> {ground.city}, {ground.state}
        </Text>
        <View style={styles.groundMeta}>
          <Text style={styles.groundPrice}>₹{ground.pricePerHour}/hr</Text>
          {ground.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        <View style={styles.groundSports}>
          {(ground.supportedSports || []).slice(0, 3).map(s => (
            <Text key={s} style={styles.groundSportEmoji}>{SPORT_EMOJI[s] || '🏃'}</Text>
          ))}
        </View>
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

  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#666'
  const sectionTitleColor = isDark ? '#eee' : '#111'

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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
    >
      <Text style={[styles.greeting, { color: textColor }]}>Hey, {user?.fullName?.split(' ')[0] || 'Champ'}! 👋</Text>
      <Text style={[styles.sub, { color: mutedColor }]}>Ready for your next real battle?</Text>

      {/* Quick actions */}
      <View style={styles.cardRow}>
        {[
          { icon: 'people', label: 'Find Players', color: '#4f46e5', onPress: () => router.push('/search') },
          { icon: 'location', label: 'Find Venues', color: '#0891b2', onPress: () => router.push('/search') },
          { icon: 'trophy', label: 'Challenges', color: ACCENT, onPress: () => router.push('/challenges') },
          { icon: 'add-circle', label: 'Create Match', color: '#059669', onPress: () => router.push('/create-match') },
        ].map(item => (
          <TouchableOpacity key={item.label} style={[styles.card, { backgroundColor: cardBg }]} onPress={item.onPress} activeOpacity={0.8}>
            <View style={[styles.cardIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={26} color={item.color} />
            </View>
            <Text style={[styles.cardLabel, { color: isDark ? '#ddd' : '#333' }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Nearby Players */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Players Near You</Text>
        <TouchableOpacity onPress={() => router.push('/search')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      {loadingPlayers
        ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
        : players.length === 0
          ? (
            <View style={[styles.emptyBox, { backgroundColor: cardBg }]}>
              <Ionicons name="people-outline" size={36} color="#ccc" />
              <Text style={[styles.emptyText, { color: isDark ? '#666' : '#bbb' }]}>No players found nearby</Text>
            </View>
          )
          : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8, gap: 12 }}>
              {players.map(p => (
                <PlayerCard key={p.id} player={p} isDark={isDark} onPress={() => router.push(`/player/${p.id}`)} />
              ))}
            </ScrollView>
          )
      }

      {/* Nearby Venues */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Venues Near You</Text>
        <TouchableOpacity onPress={() => router.push('/search')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      {loadingGrounds
        ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
        : grounds.length === 0
          ? (
            <View style={[styles.emptyBox, { backgroundColor: cardBg }]}>
              <Ionicons name="location-outline" size={36} color="#ccc" />
              <Text style={[styles.emptyText, { color: isDark ? '#666' : '#bbb' }]}>No venues found nearby</Text>
              <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/register-venue')}>
                <Text style={styles.registerBtnText}>Register a Venue</Text>
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
  content: { padding: 16, paddingBottom: 40 },
  greeting: { fontSize: 22, fontFamily: 'Poppins_700Bold', marginBottom: 2 },
  sub: { fontSize: 13, marginBottom: 20 },
  cardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  card: {
    flex: 1, minWidth: '44%',
    borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardIcon: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  cardLabel: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  seeAll: { fontSize: 13, color: ACCENT, fontFamily: 'Poppins_600SemiBold' },
  emptyBox: { borderRadius: 14, padding: 28, alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 13, marginTop: 8, fontFamily: 'Poppins_500Medium' },
  registerBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: ACCENT, borderRadius: 20 },
  registerBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },

  // Player card
  playerCard: {
    width: 130, borderRadius: 14, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
    marginBottom: 16,
  },
  playerAvatar: { width: 52, height: 52, borderRadius: 26, marginBottom: 6 },
  playerAvatarFallback: { width: 52, height: 52, borderRadius: 26, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  playerAvatarText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold' },
  playerName: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  playerHandle: { fontSize: 11, marginTop: 1, textAlign: 'center' },
  sportBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5, backgroundColor: ACCENT + '18', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  sportEmoji: { fontSize: 11 },
  sportBadgeText: { fontSize: 9, color: ACCENT, fontFamily: 'Poppins_600SemiBold' },
  playerCity: { fontSize: 10, marginTop: 4, textAlign: 'center' },

  // Ground card
  groundCard: {
    borderRadius: 14, overflow: 'hidden',
    flexDirection: 'row', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  groundImg: { width: 90, height: 90 },
  groundImgFallback: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center' },
  groundInfo: { flex: 1, padding: 10 },
  groundName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  groundCity: { fontSize: 11, marginTop: 2 },
  groundMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  groundPrice: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: ACCENT },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verifiedText: { fontSize: 10, color: '#22c55e', fontFamily: 'Poppins_500Medium' },
  groundSports: { flexDirection: 'row', gap: 4, marginTop: 4 },
  groundSportEmoji: { fontSize: 14 },
})
