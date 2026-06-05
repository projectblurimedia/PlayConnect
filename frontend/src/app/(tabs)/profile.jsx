import React, { useEffect, useState, useCallback } from 'react'
import { View, Text as RNText, ScrollView, StyleSheet, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useRouter } from 'expo-router'
import { getConnections } from '../../services/api'

const ACCENT = '#C8102E'
function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

const SPORT_EMOJI = { CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', BADMINTON: '🏸', VOLLEYBALL: '🏐', KABADDI: '🤼', TENNIS: '🎾', OTHER: '🏃' }

export default function ProfileScreen() {
  const user = useSelector(state => state.user.user)
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()
  const initials = (user?.fullName || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const [connections, setConnections] = useState([])
  const [loadingConn, setLoadingConn] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const bg = isDark ? '#111' : '#f8f9fa'
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
      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          {user?.profilePhotoUrl
            ? <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatar} />
            : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )
          }
        </View>
        <Text style={styles.name}>{user?.fullName || '—'}</Text>
        <Text style={styles.handle}>@{user?.username || '—'}</Text>
        <Text style={styles.phone}>{user?.phone || ''}</Text>
        {user?.city && (
          <Text style={styles.location}><Ionicons name="location-outline" size={12} /> {user.city}, {user.state}</Text>
        )}
      </View>

      <View style={[styles.statsRow, { backgroundColor: cardBg }]}>
        {[
          { label: 'Matches', value: '0' },
          { label: 'Wins', value: '0' },
          { label: 'Friends', value: loadingConn ? '…' : String(connections.length) },
        ].map(s => (
          <View key={s.label} style={styles.statItem}>
            <Text style={[styles.statValue, { color: textColor }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: mutedColor }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Sports */}
      {user?.sports?.length > 0 && (
        <View style={[styles.sportsCard, { backgroundColor: cardBg }]}>
          <Text style={styles.sectionTitle}>My Sports</Text>
          {user.sports.map((s, i) => (
            <View key={i} style={[styles.sportRow, { borderBottomColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
              <Text style={styles.sportEmoji}>{SPORT_EMOJI[s.sport] || '🏃'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sportName, { color: textColor }]}>{s.sport}</Text>
                {s.skillLevel && <Text style={[styles.sportLevel, { color: mutedColor }]}>{s.skillLevel}{s.preferredRole ? ` · ${s.preferredRole}` : ''}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Connections / Friends */}
      <View style={[styles.connectionsCard, { backgroundColor: cardBg }]}>
        <Text style={styles.sectionTitle}>My Connections</Text>
        {loadingConn
          ? <ActivityIndicator color={ACCENT} style={{ paddingVertical: 20 }} />
          : connections.length === 0
            ? (
              <View style={styles.emptyConn}>
                <Ionicons name="people-outline" size={36} color={isDark ? '#333' : '#ddd'} />
                <Text style={[styles.emptyConnText, { color: mutedColor }]}>No connections yet</Text>
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
                    <TouchableOpacity key={c.connectionId} style={styles.friendItem} onPress={() => router.push(`/player/${c.user.id}`)}>
                      {c.user.profilePhotoUrl
                        ? <Image source={{ uri: c.user.profilePhotoUrl }} style={styles.friendAvatar} />
                        : <View style={styles.friendAvatarFallback}><Text style={styles.friendAvatarText}>{fi}</Text></View>
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
  profileCard: { backgroundColor: ACCENT, alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#fff' },
  avatarFallback: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  avatarInitials: { fontSize: 32, fontFamily: 'Poppins_700Bold', color: '#fff' },
  name: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#fff' },
  handle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  phone: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  location: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: -16, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 6,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontFamily: 'Poppins_700Bold' },
  statLabel: { fontSize: 11, marginTop: 3 },
  sportsCard: { margin: 16, marginTop: 12, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  sectionTitle: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: ACCENT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  sportEmoji: { fontSize: 22 },
  sportName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  sportLevel: { fontSize: 12, marginTop: 1 },
  connectionsCard: { margin: 16, marginTop: 0, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  emptyConn: { alignItems: 'center', paddingVertical: 20 },
  emptyConnText: { fontSize: 13, fontFamily: 'Poppins_500Medium', marginTop: 10 },
  findBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: ACCENT, borderRadius: 20 },
  findBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  friendsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  friendItem: { width: 80, alignItems: 'center' },
  friendAvatar: { width: 52, height: 52, borderRadius: 26, marginBottom: 6 },
  friendAvatarFallback: { width: 52, height: 52, borderRadius: 26, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  friendAvatarText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold' },
  friendName: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  friendHandle: { fontSize: 10, textAlign: 'center', marginTop: 1 },
})
