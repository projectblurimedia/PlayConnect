import React, { useCallback, useState } from 'react'
import {
  View, Text as RNText, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { getMyGrounds } from '../services/api'

const ACCENT = '#C8102E'
const SPORT_EMOJI = {
  CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', BADMINTON: '🏸',
  VOLLEYBALL: '🏐', KABADDI: '🤼', TENNIS: '🎾', OTHER: '🏃',
}

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

export default function MyVenuesScreen() {
  const router = useRouter()
  const theme = useSelector(s => s.user.theme)
  const isDark = theme === 'dark'

  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'

  const [grounds, setGrounds] = useState([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => {
    let active = true
    ;(async () => {
      try {
        const data = await getMyGrounds()
        if (active) setGrounds(data.grounds || [])
      } catch {
        if (active) setGrounds([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, []))

  const renderGround = ({ item: g }) => (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.thumbWrap}>
        {g.photos?.[0]
          ? <Image source={{ uri: g.photos[0] }} style={styles.thumb} resizeMode="cover" />
          : (
            <View style={[styles.thumbFallback, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
              <Ionicons name="location" size={30} color="#ccc" />
            </View>
          )
        }
        {g.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.groundName, { color: textColor }]} numberOfLines={1}>{g.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={mutedColor} />
          <Text style={[styles.metaText, { color: mutedColor }]} numberOfLines={1}> {g.city}, {g.state}</Text>
        </View>

        <View style={styles.sportsRow}>
          {(g.supportedSports || []).slice(0, 4).map(s => (
            <Text key={s} style={styles.sportEmoji}>{SPORT_EMOJI[s] || '🏃'}</Text>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: ACCENT }]}>₹{g.pricePerHour}</Text>
            <Text style={[styles.statLabel, { color: mutedColor }]}>/hr</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: textColor }]}>{g._count?.slots || 0}</Text>
            <Text style={[styles.statLabel, { color: mutedColor }]}>slots</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: ACCENT }]}
            onPress={() => router.push(`/manage-slots/${g.id}`)}
          >
            <Ionicons name="time-outline" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Manage Slots</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: ACCENT }]}
            onPress={() => router.push(`/ground/${g.id}`)}
          >
            <Ionicons name="eye-outline" size={14} color={ACCENT} />
            <Text style={[styles.actionBtnOutlineText, { color: ACCENT }]}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: ACCENT }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Venues</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/register-venue')}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator color={ACCENT} style={{ marginTop: 48 }} />
        : (
          <FlatList
            data={grounds}
            keyExtractor={g => g.id}
            renderItem={renderGround}
            contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="location-outline" size={56} color="#ccc" />
                <Text style={[styles.emptyTitle, { color: mutedColor }]}>No venues registered</Text>
                <Text style={[styles.emptyHint, { color: mutedColor }]}>Register your first venue to manage slots and bookings</Text>
                <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/register-venue')}>
                  <Text style={styles.registerBtnText}>Register a Venue</Text>
                </TouchableOpacity>
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
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 14,
  },
  headerBack: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold' },
  addBtn: { padding: 4 },

  card: {
    borderRadius: 18, overflow: 'hidden', flexDirection: 'row',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    minHeight: 140,
  },
  thumbWrap: { width: 110, position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  thumbFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  verifiedBadge: {
    position: 'absolute', bottom: 8, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  verifiedText: { fontSize: 9, color: '#22c55e', fontFamily: 'Poppins_600SemiBold' },

  cardBody: { flex: 1, padding: 12, gap: 4 },
  groundName: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 11.5 },
  sportsRow: { flexDirection: 'row', gap: 3, marginTop: 2 },
  sportEmoji: { fontSize: 16 },

  statsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statValue: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  statLabel: { fontSize: 11 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, borderRadius: 10, paddingVertical: 7,
  },
  actionBtnText: { color: '#fff', fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  actionBtnOutline: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  actionBtnOutlineText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },

  emptyBox: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginTop: 14 },
  emptyHint: { fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  registerBtn: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: ACCENT, borderRadius: 22 },
  registerBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
})
