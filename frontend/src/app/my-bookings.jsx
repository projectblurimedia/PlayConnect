import React, { useState, useCallback } from 'react'
import {
  View, Text as RNText, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
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
    Alert.alert('Cancel Booking', `Cancel slot at ${booking.ground?.name}?`, [
      { text: 'No' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await cancelGroundBooking(booking.groundId, booking.id)
            load()
          } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to cancel')
          }
        },
      },
    ])
  }

  const renderBooking = ({ item: b }) => {
    const hrs = (new Date(b.endTime) - new Date(b.startTime)) / 3600000
    const total = Math.round((b.priceOverride ?? b.ground?.pricePerHour) * hrs)

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg }]}
        onPress={() => router.push(`/ground/${b.groundId}`)}
        activeOpacity={0.85}
      >
        {/* Ground thumbnail */}
        <View style={styles.thumbWrap}>
          {b.ground?.photos?.[0]
            ? <Image source={{ uri: b.ground.photos[0] }} style={styles.thumb} resizeMode="cover" />
            : (
              <View style={[styles.thumbFallback, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                <Ionicons name="location" size={28} color="#ccc" />
              </View>
            )
          }
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={[styles.groundName, { color: textColor }]} numberOfLines={1}>
              {b.ground?.name}
            </Text>
            <View style={[styles.sportBadge, { backgroundColor: ACCENT + '15' }]}>
              <Text style={[styles.sportText, { color: ACCENT }]}>{SPORT_EMOJI[b.sport]} {b.sport}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={13} color={mutedColor} />
            <Text style={[styles.infoText, { color: mutedColor }]} numberOfLines={1}>
              {' '}{b.ground?.city}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={13} color={mutedColor} />
            <Text style={[styles.infoText, { color: mutedColor }]}>
              {' '}{fmtDate(b.startTime)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={13} color={mutedColor} />
            <Text style={[styles.infoText, { color: mutedColor }]}>
              {' '}{fmtTime(b.startTime)} – {fmtTime(b.endTime)}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={[styles.totalLabel, { color: mutedColor }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: ACCENT }]}>₹{total}</Text>
            </View>
            {tab === 'upcoming' && (
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor }]}
                onPress={() => handleCancel(b)}
              >
                <Text style={[styles.cancelBtnText, { color: mutedColor }]}>Cancel</Text>
              </TouchableOpacity>
            )}
            {tab === 'past' && (
              <View style={[styles.pastBadge, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                <Text style={[styles.pastBadgeText, { color: mutedColor }]}>Completed</Text>
              </View>
            )}
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
    borderRadius: 18, overflow: 'hidden', flexDirection: 'row',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  thumbWrap: { width: 100 },
  thumb: { width: '100%', height: '100%' },
  thumbFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },

  cardBody: { flex: 1, padding: 12, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  groundName: { flex: 1, fontSize: 14, fontFamily: 'Poppins_700Bold' },
  sportBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  sportText: { fontSize: 10, fontFamily: 'Poppins_600SemiBold' },

  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 11.5 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  totalLabel: { fontSize: 10, fontFamily: 'Poppins_500Medium' },
  totalAmount: { fontSize: 18, fontFamily: 'Poppins_700Bold' },

  cancelBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5 },
  cancelBtnText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  pastBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pastBadgeText: { fontSize: 11, fontFamily: 'Poppins_500Medium' },

  emptyBox: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginTop: 14 },
  browseBtn: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: ACCENT, borderRadius: 22 },
  browseBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
})
