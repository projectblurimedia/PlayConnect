import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text as RNText, ScrollView, StyleSheet, Image,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSelector } from 'react-redux'
import { useRouter } from 'expo-router'
import { getConnections, getPlayerProfile } from '../../services/api'
import CricketStatsSection from '../../components/CricketStatsSection'

const ACCENT = '#C8102E'

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

export default function ProfileScreen() {
  const user = useSelector(state => state.user.user)
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()
  const initials = (user?.fullName || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const [connections, setConnections] = useState([])
  const [loadingConn, setLoadingConn] = useState(true)
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
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

  const loadProfile = useCallback(async () => {
    if (!user?.id) { setLoadingProfile(false); return }
    try {
      const data = await getPlayerProfile(user.id)
      setProfile(data.user)
    } catch {
      setProfile(null)
    } finally {
      setLoadingProfile(false)
    }
  }, [user?.id])

  useEffect(() => { loadConnections() }, [loadConnections])
  useEffect(() => { loadProfile() }, [loadProfile])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadConnections(), loadProfile()])
    setRefreshing(false)
  }

  const cricket = profile?.sports?.find(s => s.sport === 'CRICKET')

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
    >
      {/* Profile header */}
      <View style={[styles.profileHeader, { backgroundColor: cardBg }]}>
        <LinearGradient
          colors={['#e0112e', '#7d0a1c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.coverBanner}
        >
          <View style={styles.heroDecorCircle1} />
          <View style={styles.heroDecorCircle2} />
          {(profile?.city || profile?.state) && (
            <View style={styles.bannerLocationChip}>
              <Ionicons name="location" size={12} color="#fff" />
              <Text style={styles.bannerLocationText} numberOfLines={1}>
                {[profile?.city, profile?.state].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.headerBody}>
          <View style={styles.headerTopRow}>
            <View style={[styles.headerAvatarWrap, { borderColor: cardBg }]}>
              {user?.profilePhotoUrl
                ? <Image source={{ uri: user.profilePhotoUrl }} style={styles.headerAvatar} />
                : (
                  <View style={styles.headerAvatarFallback}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )
              }
            </View>

            {user?.phone && (
              <View style={[styles.contactHighlight, { backgroundColor: ACCENT + '15' }]}>
                <Ionicons name="call" size={12} color={ACCENT} />
                <Text style={[styles.contactHighlightText, { color: ACCENT }]} numberOfLines={1}>{user.phone}</Text>
              </View>
            )}
          </View>

          <View style={styles.headerNameRow}>
            <Text style={[styles.profileName, { color: textColor }]} numberOfLines={1}>{user?.fullName || '—'}</Text>
            <Text style={[styles.profileHandle, { color: mutedColor }]} numberOfLines={1}>@{user?.username || '—'}</Text>
          </View>
        </View>
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

      <CricketStatsSection
        cricket={cricket}
        loading={loadingProfile}
        isDark={isDark}
        extraChips={[{ label: 'Friends', value: loadingConn ? '…' : String(connections.length), icon: 'people-outline', color: ACCENT }]}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },

  // ── Profile header ──
  profileHeader: {
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  coverBanner: {
    height: 58,
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecorCircle1: {
    position: 'absolute', top: -40, right: -30,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroDecorCircle2: {
    position: 'absolute', bottom: -45, left: -35,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerBody: { paddingHorizontal: 16, paddingBottom: 14 },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerAvatarWrap: {
    marginTop: -28,
    borderRadius: 32, borderWidth: 3,
  },
  headerAvatar: { width: 60, height: 60, borderRadius: 30 },
  headerAvatarFallback: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: ACCENT,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 21, fontFamily: 'Poppins_700Bold', color: '#fff' },

  // ── Banner location chip (top-right, on red gradient) ──
  bannerLocationChip: {
    position: 'absolute', top: 10, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    maxWidth: 160,
  },
  bannerLocationText: { fontSize: 11.5, fontFamily: 'Poppins_500Medium', color: '#fff' },

  // ── Contact highlight chip (top-right, on white body) ──
  contactHighlight: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, marginTop: 8,
    maxWidth: 160,
  },
  contactHighlightText: { fontSize: 11.5, fontFamily: 'Poppins_600SemiBold' },

  // ── Name row ──
  headerNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  profileName: { fontSize: 16, fontFamily: 'Poppins_700Bold', flexShrink: 1 },
  profileHandle: { fontSize: 12.5 },

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
