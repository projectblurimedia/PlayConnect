import React, { useEffect, useState } from 'react'
import {
  View, Text as RNText, ScrollView, StyleSheet, Image,
  TouchableOpacity, ActivityIndicator, StatusBar, Platform, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { getPlayerProfile, getConnectionStatus, sendConnectionRequest, acceptConnection, rejectConnection } from '../services/api'

const ACCENT = '#C8102E'
function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}
const SPORT_EMOJI = { CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', BADMINTON: '🏸', VOLLEYBALL: '🏐', KABADDI: '🤼', TENNIS: '🎾', OTHER: '🏃' }

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const myId = useSelector(state => state.user.user?.id)

  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connStatus, setConnStatus] = useState(null) // null=loading
  const [connInfo, setConnInfo] = useState(null) // { id, requesterId, receiverId }
  const [isSender, setIsSender] = useState(false)
  const [connLoading, setConnLoading] = useState(false)

  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'

  useEffect(() => {
    Promise.all([
      getPlayerProfile(id).then(d => setPlayer(d.user)).catch(() => setError('Failed to load profile')),
      id !== myId
        ? getConnectionStatus(id).then(d => {
            setConnStatus(d.status)
            setConnInfo(d.connection)
            setIsSender(d.isSender)
          }).catch(() => setConnStatus('NONE'))
        : Promise.resolve(),
    ]).finally(() => setLoading(false))
  }, [id, myId])

  const handleConnect = async () => {
    setConnLoading(true)
    try {
      const data = await sendConnectionRequest(id)
      if (data.autoAccepted) {
        setConnStatus('ACCEPTED')
        setConnInfo(data.connection)
      } else {
        setConnStatus('PENDING')
        setConnInfo(data.connection)
        setIsSender(true)
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to send request')
    } finally {
      setConnLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!connInfo?.id) return
    setConnLoading(true)
    try {
      await acceptConnection(connInfo.id)
      setConnStatus('ACCEPTED')
    } catch {
      Alert.alert('Error', 'Failed to accept request')
    } finally {
      setConnLoading(false)
    }
  }

  const handleReject = async () => {
    if (!connInfo?.id) return
    setConnLoading(true)
    try {
      await rejectConnection(connInfo.id)
      setConnStatus('REJECTED')
    } catch {
      Alert.alert('Error', 'Failed to reject request')
    } finally {
      setConnLoading(false)
    }
  }

  if (loading) return (
    <View style={[styles.centered, { backgroundColor: bg }]}>
      <ActivityIndicator size="large" color={ACCENT} />
    </View>
  )
  if (error || !player) return (
    <View style={[styles.centered, { backgroundColor: bg }]}>
      <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
      <Text style={[styles.errorText, { color: mutedColor }]}>{error || 'Player not found'}</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  )

  const initials = (player.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const isMe = myId === id

  const renderConnectionButton = () => {
    if (isMe) return null
    if (connLoading) return (
      <View style={styles.connBtnWrap}>
        <ActivityIndicator color="#fff" size="small" />
      </View>
    )

    if (connStatus === 'ACCEPTED') return (
      <View style={styles.connBtnRow}>
        <TouchableOpacity style={[styles.chatBtn, styles.connectedBtn]} onPress={() => router.push(`/chat/${id}`)}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
          <Text style={styles.chatBtnText}>Message</Text>
        </TouchableOpacity>
      </View>
    )

    if (connStatus === 'PENDING' && !isSender) return (
      <View style={styles.connBtnRow}>
        <TouchableOpacity style={[styles.chatBtn, { backgroundColor: '#22c55e' }]} onPress={handleAccept}>
          <Ionicons name="checkmark-outline" size={18} color="#fff" />
          <Text style={styles.chatBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chatBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={handleReject}>
          <Ionicons name="close-outline" size={18} color="#fff" />
          <Text style={styles.chatBtnText}>Decline</Text>
        </TouchableOpacity>
      </View>
    )

    if (connStatus === 'PENDING' && isSender) return (
      <TouchableOpacity style={[styles.chatBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]} disabled>
        <Ionicons name="time-outline" size={18} color="#fff" />
        <Text style={styles.chatBtnText}>Request Sent</Text>
      </TouchableOpacity>
    )

    return (
      <TouchableOpacity style={styles.chatBtn} onPress={handleConnect}>
        <Ionicons name="person-add-outline" size={18} color="#fff" />
        <Text style={styles.chatBtnText}>Connect</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar backgroundColor={ACCENT} barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <TouchableOpacity style={styles.heroBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          {player.profilePhotoUrl
            ? <Image source={{ uri: player.profilePhotoUrl }} style={styles.avatar} />
            : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{initials}</Text></View>
          }
          <Text style={styles.heroName}>{player.fullName}</Text>
          <Text style={styles.heroHandle}>@{player.username}</Text>
          {player.city && <Text style={styles.heroCity}><Ionicons name="location-outline" size={13} /> {player.city}, {player.state}</Text>}

          {connStatus === 'ACCEPTED' && !isMe && (
            <View style={styles.connectedBadge}>
              <Ionicons name="people" size={13} color="#22c55e" />
              <Text style={styles.connectedBadgeText}>Connected</Text>
            </View>
          )}

          <View style={{ marginTop: 14 }}>
            {renderConnectionButton()}
          </View>
        </View>

        <View style={{ padding: 16 }}>
          {player.bio && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={styles.cardLabel}>About</Text>
              <Text style={[styles.bioText, { color: textColor }]}>{player.bio}</Text>
            </View>
          )}

          {player.sports?.length > 0 && (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={styles.cardLabel}>Sports</Text>
              {player.sports.map((s, i) => (
                <View key={i} style={[styles.sportRow, { borderBottomColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                  <Text style={styles.sportEmoji}>{SPORT_EMOJI[s.sport] || '🏃'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sportName, { color: textColor }]}>{s.sport}</Text>
                    <Text style={[styles.sportMeta, { color: mutedColor }]}>
                      {[s.skillLevel, s.preferredRole].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <View style={styles.sportStats}>
                    <Text style={[styles.statNum, { color: textColor }]}>{s.matchesPlayed}</Text>
                    <Text style={[styles.statLbl, { color: mutedColor }]}>played</Text>
                  </View>
                  <View style={[styles.sportStats, { marginLeft: 12 }]}>
                    <Text style={[styles.statNum, { color: textColor }]}>{s.matchesWon}</Text>
                    <Text style={[styles.statLbl, { color: mutedColor }]}>won</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, marginTop: 12, fontFamily: 'Poppins_500Medium' },
  backBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: ACCENT, borderRadius: 20 },
  backBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  hero: {
    backgroundColor: ACCENT, alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 28, paddingHorizontal: 20,
  },
  heroBack: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 48, left: 16 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff', marginBottom: 10 },
  avatarFallback: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', marginBottom: 10 },
  avatarText: { color: '#fff', fontSize: 30, fontFamily: 'Poppins_700Bold' },
  heroName: { color: '#fff', fontSize: 20, fontFamily: 'Poppins_700Bold' },
  heroHandle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  heroCity: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  connectedBadgeText: { color: '#22c55e', fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  connBtnWrap: { height: 38, justifyContent: 'center', alignItems: 'center' },
  connBtnRow: { flexDirection: 'row', gap: 10 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  connectedBtn: { backgroundColor: 'rgba(255,255,255,0.2)' },
  chatBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  cardLabel: { fontSize: 11, fontFamily: 'Poppins_700Bold', color: ACCENT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  bioText: { fontSize: 14, lineHeight: 22 },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  sportEmoji: { fontSize: 22 },
  sportName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  sportMeta: { fontSize: 12, marginTop: 1 },
  sportStats: { alignItems: 'center' },
  statNum: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  statLbl: { fontSize: 10 },
})
