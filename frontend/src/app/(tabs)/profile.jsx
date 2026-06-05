import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text as RNText, ScrollView, StyleSheet, Image,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSelector } from 'react-redux'
import { useRouter } from 'expo-router'
import { getConnections } from '../../services/api'

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

export default function ProfileScreen() {
  const user = useSelector(state => state.user.user)
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()
  const initials = (user?.fullName || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const [connections, setConnections] = useState([])
  const [loadingConn, setLoadingConn] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const bg = isDark ? '#111' : '#efefef'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'

  const loadConnections = useCallback(async () => {
    try {
      const data = await getConnections()
      setConnections(data.connections || [])
    } catch {
      setConnections([])
    } finally {
      setLoadingConn(false)
    }
  }, [])

  useEffect(() => { loadConnections() }, [loadConnections])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadConnections()
    setRefreshing(false)
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
    >
      {/* Profile hero */}
      <LinearGradient
        colors={[ACCENT, '#a00d24']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroAvatar}>
          {user?.profilePhotoUrl
            ? <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatar} />
            : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )
          }
          <View style={styles.heroBadge}>
            <Ionicons name="walk" size={12} color={ACCENT} />
          </View>
        </View>
        <Text style={styles.heroName}>{user?.fullName || '—'}</Text>
        <Text style={styles.heroHandle}>@{user?.username || '—'}</Text>
        {(user?.city || user?.state) && (
          <View style={styles.heroLocation}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroLocationText}>{[user.city, user.state].filter(Boolean).join(', ')}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: cardBg }]}>
        {[
          { label: 'Matches', value: '0', icon: 'football-outline' },
          { label: 'Wins', value: '0', icon: 'trophy-outline' },
          { label: 'Friends', value: loadingConn ? '…' : String(connections.length), icon: 'people-outline' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            <View style={styles.statItem}>
              <Ionicons name={s.icon} size={16} color={ACCENT} style={{ marginBottom: 4 }} />
              <Text style={[styles.statValue, { color: textColor }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: mutedColor }]}>{s.label}</Text>
            </View>
            {i < 2 && <View style={[styles.statDivider, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]} />}
          </React.Fragment>
        ))}
      </View>

      {/* Sports */}
      {user?.sports?.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={styles.sectionLabel}>MY SPORTS</Text>
          {user.sports.map((s, i) => {
            const skillColor = SKILL_COLOR[s.skillLevel] || '#888'
            return (
              <View
                key={i}
                style={[styles.sportRow, { borderBottomColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}
              >
                <View style={styles.sportEmojiWrap}>
                  <Text style={styles.sportEmoji}>{SPORT_EMOJI[s.sport] || '🏃'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sportName, { color: textColor }]}>{s.sport}</Text>
                  {s.preferredRole && (
                    <Text style={[styles.sportRole, { color: mutedColor }]}>{s.preferredRole}</Text>
                  )}
                </View>
                {s.skillLevel && (
                  <View style={[styles.skillBadge, { backgroundColor: skillColor + '18', borderColor: skillColor + '40' }]}>
                    <Text style={[styles.skillBadgeText, { color: skillColor }]}>{s.skillLevel}</Text>
                  </View>
                )}
              </View>
            )
          })}
        </View>
      )}

      {/* Contact info */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={styles.sectionLabel}>CONTACT INFO</Text>
        {[
          { icon: 'call-outline', label: 'Phone', value: user?.phone },
          { icon: 'mail-outline', label: 'Email', value: user?.email },
          { icon: 'calendar-outline', label: 'Date of Birth', value: user?.dob },
          { icon: 'person-outline', label: 'Gender', value: user?.gender },
        ].filter(f => f.value).map(f => (
          <View key={f.label} style={[styles.infoRow, { borderBottomColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
            <View style={styles.infoIconWrap}>
              <Ionicons name={f.icon} size={16} color={ACCENT} />
            </View>
            <View>
              <Text style={[styles.infoLabel, { color: mutedColor }]}>{f.label}</Text>
              <Text style={[styles.infoValue, { color: textColor }]}>{f.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Connections */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={styles.sectionLabel}>
          MY CONNECTIONS{!loadingConn ? ` (${connections.length})` : ''}
        </Text>
        {loadingConn
          ? <ActivityIndicator color={ACCENT} style={{ paddingVertical: 20 }} />
          : connections.length === 0
            ? (
              <View style={styles.emptyConn}>
                <View style={styles.emptyConnIconBg}>
                  <Ionicons name="people-outline" size={26} color={ACCENT} />
                </View>
                <Text style={[styles.emptyConnTitle, { color: textColor }]}>No connections yet</Text>
                <Text style={[styles.emptyConnHint, { color: mutedColor }]}>Find and connect with players near you</Text>
                <TouchableOpacity onPress={() => router.push('/search')} style={styles.findBtn}>
                  <Text style={styles.findBtnText}>Find Players</Text>
                </TouchableOpacity>
              </View>
            )
            : (
              <View style={styles.friendsGrid}>
                {connections.map(c => {
                  const fi = (c.user.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <TouchableOpacity
                      key={c.connectionId}
                      style={styles.friendItem}
                      onPress={() => router.push(`/player/${c.user.id}`)}
                      activeOpacity={0.8}
                    >
                      {c.user.profilePhotoUrl
                        ? <Image source={{ uri: c.user.profilePhotoUrl }} style={styles.friendAvatar} />
                        : (
                          <View style={styles.friendAvatarFallback}>
                            <Text style={styles.friendAvatarText}>{fi}</Text>
                          </View>
                        )
                      }
                      <Text style={[styles.friendName, { color: textColor }]} numberOfLines={1}>{c.user.fullName}</Text>
                      <Text style={[styles.friendHandle, { color: mutedColor }]} numberOfLines={1}>@{c.user.username}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )
        }
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },

  // ── Profile hero ──
  heroCard: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  heroAvatar: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarFallback: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarInitials: { fontSize: 32, fontFamily: 'Poppins_700Bold', color: '#fff' },
  heroBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
  },
  heroName: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#fff', marginBottom: 4 },
  heroHandle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 8 },
  heroLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroLocationText: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: -20,
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    marginBottom: 14,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statValue: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 2 },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, marginVertical: 8 },

  // ── Card ──
  card: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },

  // ── Sport rows ──
  sportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, borderBottomWidth: 1,
  },
  sportEmojiWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: ACCENT + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  sportEmoji: { fontSize: 20 },
  sportName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  sportRole: { fontSize: 11.5 },
  skillBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  skillBadgeText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },

  // ── Info rows ──
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, borderBottomWidth: 1,
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: ACCENT + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  infoLabel: { fontSize: 11, marginBottom: 2 },
  infoValue: { fontSize: 13.5, fontFamily: 'Poppins_600SemiBold' },

  // ── Connections ──
  emptyConn: { alignItems: 'center', paddingVertical: 16 },
  emptyConnIconBg: {
    width: 54, height: 54, borderRadius: 15,
    backgroundColor: ACCENT + '12',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  emptyConnTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', marginBottom: 4 },
  emptyConnHint: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  findBtn: {
    marginTop: 14, paddingHorizontal: 24, paddingVertical: 9,
    backgroundColor: ACCENT, borderRadius: 22,
  },
  findBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  friendsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  friendItem: { width: 80, alignItems: 'center' },
  friendAvatar: { width: 54, height: 54, borderRadius: 27, marginBottom: 6, borderWidth: 2, borderColor: ACCENT + '30' },
  friendAvatarFallback: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  friendAvatarText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold' },
  friendName: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', textAlign: 'center', marginBottom: 1 },
  friendHandle: { fontSize: 10, textAlign: 'center' },
})
