import React, { useState, useCallback } from 'react'
import {
  View, Text as RNText, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { showAlert } from '@/components/GlobalAlert'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { getMyBookings, cancelGroundBooking } from '../services/api'

const ACCENT = '#C8102E'
const SPORT_EMOJI = {
  CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', BADMINTON: '🏸',
  VOLLEYBALL: '🏐', KABADDI: '🤼', TENNIS: '🎾', OTHER: '🏃',
}

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

function fmtTime(iso) {
  const d = new Date(iso)
  let h = d.getUTCHours()
  const m = d.getUTCMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtDate(iso) {
  const d = new Date(iso)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export default function MyBookingsScreen() {
  const router = useRouter()
  const theme = useSelector(s => s.user.theme)
  const isDark = theme === 'dark'

  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'
  const borderColor = isDark ? '#2a2a2a' : '#e5e7eb'

  const [tab, setTab] = useState('upcoming')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMyBookings(tab)
      setBookings(data.bookings || [])
    } catch {
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleCancel = (booking) => {
    showAlert('Cancel Booking', `Cancel slot at ${booking.ground?.name}?`, [
      { text: 'No' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await cancelGroundBooking(booking.groundId, booking.id)
            load()
          } catch (e) {
            showAlert('Error', e.response?.data?.error || 'Failed to cancel')
          }
        },
      },
    ])
  }

  const renderBooking = ({ item: b }) => {
    const hrs = (new Date(b.endTime) - new Date(b.startTime)) / 3600000
    const total = Math.round((b.priceOverride ?? b.ground?.pricePerHour) * hrs)
    const isUpcoming = tab === 'upcoming'

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg }]}
        onPress={() => router.push(`/ground/${b.groundId}`)}
        activeOpacity={0.85}
      >
        {/* Left accent strip */}
        <View style={[styles.cardAccent, { backgroundColor: isUpcoming ? ACCENT : '#9ca3af' }]} />

        {/* Ground thumbnail */}
        <View style={styles.thumbWrap}>
          {b.ground?.photos?.[0]
            ? <Image source={{ uri: b.ground.photos[0] }} style={styles.thumb} resizeMode="cover" />
            : (
              <View style={[styles.thumbFallback, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                <Ionicons name="location" size={24} color="#ccc" />
              </View>
            )
          }
        </View>

        <View style={styles.cardBody}>
          {/* Row 1: Name + Sport emoji */}
          <View style={styles.cardTop}>
            <Text style={[styles.groundName, { color: textColor }]} numberOfLines={1}>
              {b.ground?.name}
            </Text>
            <Text style={styles.sportEmoji}>{SPORT_EMOJI[b.sport]}</Text>
          </View>

          {/* Row 2: Location */}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={11} color={mutedColor} />
            <Text style={[styles.infoText, { color: mutedColor }]} numberOfLines={1}>
              {' '}{b.ground?.city}
            </Text>
          </View>

          {/* Row 3: Date · Time */}
          <Text style={[styles.infoText, { color: mutedColor }]} numberOfLines={1}>
            {fmtDate(b.startTime)}{'  ·  '}{fmtTime(b.startTime)} – {fmtTime(b.endTime)}
          </Text>

          {/* Row 4: Price + Action */}
          <View style={styles.cardFooter}>
            <Text style={[styles.totalAmount, { color: ACCENT }]}>₹{total}</Text>
            {isUpcoming
              ? (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(b)}>
                  <Ionicons name="close-circle-outline" size={13} color="#fff" />
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              )
              : (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>✓ Completed</Text>
                </View>
              )
            }
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: ACCENT }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        {['upcoming', 'past'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, tab === t && styles.tabItemActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: tab === t ? ACCENT : mutedColor }]}>
              {t === 'upcoming' ? 'Upcoming' : 'Past'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color={ACCENT} style={{ marginTop: 48 }} />
        : (
          <FlatList
            data={bookings}
            keyExtractor={b => b.id}
            renderItem={renderBooking}
            contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={56} color="#ccc" />
                <Text style={[styles.emptyTitle, { color: mutedColor }]}>
                  {tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
                </Text>
                {tab === 'upcoming' && (
                  <TouchableOpacity style={styles.browseBtn} onPress={() => router.back()}>
                    <Text style={styles.browseBtnText}>Browse Venues</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )
      }
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 14,
  },
  headerBack: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold' },

  tabsRow: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2.5, borderBottomColor: ACCENT },
  tabText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  card: {
    borderRadius: 14, overflow: 'hidden', flexDirection: 'row',
    height: 110,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  thumbWrap: { width: 88, alignSelf: 'stretch' },
  thumb: { width: '100%', height: '100%' },
  thumbFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },

  cardBody: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groundName: { flex: 1, fontSize: 13, fontFamily: 'Poppins_700Bold', marginRight: 4 },
  sportEmoji: { fontSize: 18 },

  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 11, fontFamily: 'Poppins_400Regular' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalAmount: { fontSize: 17, fontFamily: 'Poppins_700Bold' },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  cancelBtnText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: '#fff' },
  completedBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#22c55e18' },
  completedBadgeText: { fontSize: 10, fontFamily: 'Poppins_500Medium', color: '#22c55e' },

  emptyBox: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginTop: 14 },
  browseBtn: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: ACCENT, borderRadius: 22 },
  browseBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
})
