import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text as RNText, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Modal, Alert, FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import {
  getGroundDetail, getGroundSlots, bookGroundSlot, cancelGroundBooking,
} from '../../services/api'

const ACCENT = '#C8102E'
const SPORT_EMOJI = {
  CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', BADMINTON: '🏸',
  VOLLEYBALL: '🏐', KABADDI: '🤼', TENNIS: '🎾', OTHER: '🏃',
}
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

function getDays(n = 14) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Slots store times as UTC "wall clock" — display with UTC methods
function fmtTime(iso) {
  const d = new Date(iso)
  let h = d.getUTCHours()
  const m = d.getUTCMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function slotDurationHrs(slot) {
  return (new Date(slot.endTime) - new Date(slot.startTime)) / 3600000
}

export default function GroundDetailScreen() {
  const { groundId } = useLocalSearchParams()
  const router = useRouter()
  const myUser = useSelector(s => s.user.user)
  const theme = useSelector(s => s.user.theme)
  const isDark = theme === 'dark'

  const [ground, setGround] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [selectedSport, setSelectedSport] = useState(null)
  const [confirmSlot, setConfirmSlot] = useState(null)
  const [ownerSlot, setOwnerSlot] = useState(null)
  const [booking, setBooking] = useState(false)
  const days = getDays(14)

  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'
  const borderColor = isDark ? '#2a2a2a' : '#e5e7eb'

  const isOwner = ground && myUser && ground.ownerId === myUser.id

  const loadGround = useCallback(async () => {
    try {
      const data = await getGroundDetail(groundId)
      setGround(data.ground)
      if (data.ground.supportedSports?.[0]) setSelectedSport(data.ground.supportedSports[0])
    } catch {
      Alert.alert('Error', 'Failed to load ground details')
    } finally {
      setLoading(false)
    }
  }, [groundId])

  const loadSlots = useCallback(async () => {
    if (!selectedDate) return
    setSlotsLoading(true)
    try {
      const data = await getGroundSlots(groundId, { date: selectedDate, sport: selectedSport || undefined })
      setSlots(data.slots || [])
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [groundId, selectedDate, selectedSport])

  useEffect(() => { loadGround() }, [loadGround])
  useEffect(() => { if (ground) loadSlots() }, [ground, loadSlots])

  const handleBook = async () => {
    if (!confirmSlot) return
    setBooking(true)
    try {
      await bookGroundSlot(groundId, confirmSlot.id)
      setConfirmSlot(null)
      loadSlots()
      Alert.alert('Booked!', 'Your slot has been booked. Pay at venue.')
    } catch (e) {
      Alert.alert('Failed', e.response?.data?.error || 'Booking failed')
    } finally {
      setBooking(false)
    }
  }

  const handleCancel = (slot) => {
    Alert.alert('Cancel Booking', 'Cancel this booking?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await cancelGroundBooking(groundId, slot.id)
            loadSlots()
          } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to cancel')
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    )
  }

  if (!ground) return null

  const slotPrice = (slot) => {
    const hrs = slotDurationHrs(slot)
    return Math.round((slot.priceOverride ?? ground.pricePerHour) * hrs)
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Hero photo */}
        <View style={styles.heroWrap}>
          {ground.photos?.[0]
            ? <Image source={{ uri: ground.photos[0] }} style={styles.heroImg} resizeMode="cover" />
            : (
              <View style={[styles.heroFallback, { backgroundColor: isDark ? '#2a2a2a' : '#e5e5e5' }]}>
                <Ionicons name="location" size={56} color="#ccc" />
                <Text style={{ color: '#ccc', marginTop: 6, fontSize: 12 }}>No Photo</Text>
              </View>
            )
          }
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroPriceBadge}>
            <Text style={styles.heroPriceText}>₹{ground.pricePerHour}/hr</Text>
          </View>
          {ground.isVerified && (
            <View style={styles.heroVerifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
              <Text style={styles.heroVerifiedText}>Verified</Text>
            </View>
          )}
        </View>

        <View style={{ padding: 14, gap: 14 }}>

          {/* Info card */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.groundName, { color: textColor }]}>{ground.name}</Text>

            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={mutedColor} />
              <Text style={[styles.metaText, { color: mutedColor }]}>
                {' '}{ground.addressLine}, {ground.city}, {ground.state}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="call-outline" size={14} color={mutedColor} />
              <Text style={[styles.metaText, { color: mutedColor }]}>{' '}{ground.contactPhone}</Text>
            </View>

            {ground.description && (
              <Text style={[styles.description, { color: mutedColor }]}>{ground.description}</Text>
            )}

            {/* Surface + Indoor */}
            <View style={[styles.tagsRow, { marginTop: 10 }]}>
              {ground.surfaceType && (
                <View style={[styles.tag, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                  <Text style={[styles.tagText, { color: textColor }]}>{ground.surfaceType}</Text>
                </View>
              )}
              <View style={[styles.tag, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                <Text style={[styles.tagText, { color: textColor }]}>{ground.isIndoor ? '🏠 Indoor' : '🌤️ Outdoor'}</Text>
              </View>
            </View>

            {/* Amenities */}
            {(ground.amenities || []).length > 0 && (
              <View style={[styles.tagsRow, { marginTop: 8 }]}>
                {ground.amenities.map(a => (
                  <View key={a} style={[styles.tag, { backgroundColor: ACCENT + '12' }]}>
                    <Text style={[styles.tagText, { color: ACCENT }]}>{a}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Sport filter tabs */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>SPORTS</Text>
            <View style={styles.sportsRow}>
              {(ground.supportedSports || []).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sportChip, selectedSport === s && styles.sportChipActive]}
                  onPress={() => setSelectedSport(selectedSport === s ? null : s)}
                >
                  <Text style={[styles.sportChipText, { color: selectedSport === s ? '#fff' : ACCENT }]}>
                    {SPORT_EMOJI[s]} {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Owner: manage slots button */}
            {isOwner && (
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => router.push(`/manage-slots/${groundId}`)}
              >
                <Ionicons name="settings-outline" size={16} color="#fff" />
                <Text style={styles.manageBtnText}>Manage Slots</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Date selector */}
          <Text style={styles.sectionLabel}>SELECT DATE</Text>
          <FlatList
            data={days}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={d => formatDate(d)}
            contentContainerStyle={{ gap: 10, paddingRight: 4 }}
            renderItem={({ item: d }) => {
              const ds = formatDate(d)
              const active = ds === selectedDate
              return (
                <TouchableOpacity
                  style={[styles.dateChip, { borderColor: active ? ACCENT : borderColor, backgroundColor: active ? ACCENT : cardBg }]}
                  onPress={() => setSelectedDate(ds)}
                >
                  <Text style={[styles.dateDayName, { color: active ? 'rgba(255,255,255,0.85)' : mutedColor }]}>
                    {DAY_NAMES[d.getDay()]}
                  </Text>
                  <Text style={[styles.dateNum, { color: active ? '#fff' : textColor }]}>{d.getDate()}</Text>
                  <Text style={[styles.dateMonth, { color: active ? 'rgba(255,255,255,0.75)' : mutedColor }]}>
                    {MONTH_NAMES[d.getMonth()]}
                  </Text>
                </TouchableOpacity>
              )
            }}
          />

          {/* Slots */}
          <Text style={[styles.sectionLabel, { marginTop: 4 }]}>AVAILABLE SLOTS</Text>
          {slotsLoading
            ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
            : slots.length === 0
              ? (
                <View style={[styles.emptySlots, { backgroundColor: cardBg }]}>
                  <Ionicons name="time-outline" size={44} color="#ccc" />
                  <Text style={[styles.emptyText, { color: mutedColor }]}>No slots for this date</Text>
                  {isOwner && (
                    <Text style={[styles.emptyHint, { color: mutedColor }]}>Tap "Manage Slots" to add availability</Text>
                  )}
                </View>
              )
              : (
                <View style={styles.slotsList}>
                  {slots.map(slot => {
                    const isMyBooking = slot.bookedById === myUser?.id
                    const isPast = new Date(slot.startTime) < new Date()
                    const price = slotPrice(slot)

                    let accentC = '#9ca3af'
                    let bgTint = isDark ? '#ffffff08' : '#f4f4f5'
                    let label = 'Taken'

                    if (isPast) { accentC = '#9ca3af'; label = 'Past' }
                    else if (isMyBooking) { accentC = '#f59e0b'; bgTint = isDark ? '#f59e0b18' : '#fef9ee'; label = 'Your Booking' }
                    else if (slot.status === 'AVAILABLE') { accentC = '#22c55e'; bgTint = isDark ? '#22c55e18' : '#f0fdf4'; label = 'Available' }
                    else if (slot.status === 'BLOCKED') { accentC = '#6b7280'; bgTint = isDark ? '#6b728018' : '#f9fafb'; label = 'Blocked' }

                    return (
                      <TouchableOpacity
                        key={slot.id}
                        style={[styles.slotRow, { backgroundColor: bgTint }]}
                        onPress={() => {
                          if (isOwner) { setOwnerSlot(slot); return }
                          if (isPast) return
                          if (slot.status === 'AVAILABLE') setConfirmSlot(slot)
                          else if (isMyBooking) handleCancel(slot)
                        }}
                        activeOpacity={isOwner || (slot.status === 'AVAILABLE' || isMyBooking) && !isPast ? 0.75 : 1}
                      >
                        <View style={[styles.slotAccentBar, { backgroundColor: accentC }]} />
                        <View style={styles.slotBody}>
                          <View style={styles.slotTimeRow}>
                            <Ionicons name="time-outline" size={13} color={accentC} />
                            <Text style={[styles.slotTimeText, { color: textColor }]}>
                              {fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}
                            </Text>
                          </View>
                          {isMyBooking && !isPast && (
                            <Text style={[styles.cancelHint, { color: '#f59e0b' }]}>tap to cancel</Text>
                          )}
                        </View>
                        <View style={styles.slotRight}>
                          <Text style={[styles.slotPriceText, { color: ACCENT }]}>₹{price}</Text>
                          <View style={[styles.slotBadge, { backgroundColor: accentC }]}>
                            <Text style={styles.slotBadgeText}>{label}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )
          }
        </View>
      </ScrollView>

      {/* Booking confirmation modal */}
      <Modal visible={!!confirmSlot} transparent animationType="fade" onRequestClose={() => setConfirmSlot(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setConfirmSlot(null)} />
          <View style={[styles.confirmSheet, { backgroundColor: cardBg }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.confirmTitle, { color: textColor }]}>Confirm Booking</Text>

            {confirmSlot && (
              <>
                <Text style={[styles.confirmGroundName, { color: textColor }]}>{ground.name}</Text>

                <View style={[styles.confirmInfoBox, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
                  <View style={styles.confirmRow}>
                    <Ionicons name="calendar-outline" size={16} color={mutedColor} />
                    <Text style={[styles.confirmDetail, { color: textColor }]}>{selectedDate}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Ionicons name="time-outline" size={16} color={mutedColor} />
                    <Text style={[styles.confirmDetail, { color: textColor }]}>
                      {fmtTime(confirmSlot.startTime)} – {fmtTime(confirmSlot.endTime)}
                    </Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={{ fontSize: 16 }}>{SPORT_EMOJI[confirmSlot.sport]}</Text>
                    <Text style={[styles.confirmDetail, { color: textColor }]}>{confirmSlot.sport}</Text>
                  </View>
                </View>

                <View style={[styles.priceBox, { backgroundColor: ACCENT + '12' }]}>
                  <Text style={[styles.priceLabel, { color: mutedColor }]}>Total Amount</Text>
                  <Text style={[styles.priceValue, { color: ACCENT }]}>₹{slotPrice(confirmSlot)}</Text>
                </View>
                <Text style={[styles.payNote, { color: mutedColor }]}>💵 Payment collected at the venue</Text>
              </>
            )}

            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor }]}
                onPress={() => setConfirmSlot(null)}
              >
                <Text style={[styles.btnSecondaryText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleBook} disabled={booking}>
                {booking
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Book Now</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Owner slot detail modal */}
      <Modal visible={!!ownerSlot} transparent animationType="fade" onRequestClose={() => setOwnerSlot(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setOwnerSlot(null)} />
          <View style={[styles.confirmSheet, { backgroundColor: cardBg }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.confirmTitle, { color: textColor }]}>Slot Details</Text>
            {ownerSlot && (
              <>
                <View style={[styles.confirmInfoBox, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
                  <View style={styles.confirmRow}>
                    <Ionicons name="time-outline" size={16} color={mutedColor} />
                    <Text style={[styles.confirmDetail, { color: textColor }]}>
                      {fmtTime(ownerSlot.startTime)} – {fmtTime(ownerSlot.endTime)}
                    </Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={{ fontSize: 16 }}>{SPORT_EMOJI[ownerSlot.sport]}</Text>
                    <Text style={[styles.confirmDetail, { color: textColor }]}>{ownerSlot.sport}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Ionicons name="cash-outline" size={16} color={mutedColor} />
                    <Text style={[styles.confirmDetail, { color: ACCENT }]}>₹{slotPrice(ownerSlot)}</Text>
                  </View>
                  {ownerSlot.status === 'BOOKED' && ownerSlot.bookedBy && (
                    <>
                      <View style={styles.confirmRow}>
                        <Ionicons name="person-circle-outline" size={16} color='#3b82f6' />
                        <Text style={[styles.confirmDetail, { color: '#3b82f6' }]}>{ownerSlot.bookedBy.fullName}</Text>
                      </View>
                      {ownerSlot.bookedBy.phone && (
                        <View style={styles.confirmRow}>
                          <Ionicons name="call-outline" size={16} color='#3b82f6' />
                          <Text style={[styles.confirmDetail, { color: '#3b82f6' }]}>{ownerSlot.bookedBy.phone}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
                <View style={[styles.priceBox, {
                  backgroundColor: ownerSlot.status === 'BOOKED' ? '#3b82f620'
                    : ownerSlot.status === 'AVAILABLE' ? '#22c55e12' : '#6b728012',
                }]}>
                  <Text style={[styles.priceLabel, { color: mutedColor }]}>Status</Text>
                  <Text style={[styles.priceValue, {
                    color: ownerSlot.status === 'BOOKED' ? '#3b82f6'
                      : ownerSlot.status === 'AVAILABLE' ? '#22c55e' : '#6b7280',
                    fontSize: 18,
                  }]}>{ownerSlot.status}</Text>
                </View>
              </>
            )}
            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor, marginTop: 4 }]}
              onPress={() => setOwnerSlot(null)}
            >
              <Text style={[styles.btnSecondaryText, { color: textColor }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  heroWrap: { position: 'relative', height: 220 },
  heroImg: { width: '100%', height: '100%' },
  heroFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  backBtn: {
    position: 'absolute', top: 44, left: 14,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroPriceBadge: {
    position: 'absolute', bottom: 12, left: 14,
    backgroundColor: '#C8102E', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroPriceText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_700Bold' },
  heroVerifiedBadge: {
    position: 'absolute', top: 44, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  heroVerifiedText: { fontSize: 11, color: '#22c55e', fontFamily: 'Poppins_600SemiBold' },

  card: {
    borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  groundName: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  metaText: { fontSize: 13, flex: 1, lineHeight: 18 },
  description: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, fontFamily: 'Poppins_500Medium' },

  sectionLabel: {
    fontSize: 11, fontFamily: 'Poppins_700Bold',
    color: '#C8102E', letterSpacing: 1, marginBottom: 10,
  },
  sportsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sportChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#C8102E',
  },
  sportChipActive: { backgroundColor: '#C8102E' },
  sportChipText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },

  manageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#1d4ed8',
    borderRadius: 12, paddingVertical: 12, marginTop: 16,
  },
  manageBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  // Date chips
  dateChip: {
    width: 60, paddingVertical: 10, borderRadius: 14,
    alignItems: 'center', borderWidth: 1.5,
  },
  dateDayName: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  dateNum: { fontSize: 18, fontFamily: 'Poppins_700Bold', lineHeight: 22 },
  dateMonth: { fontSize: 9, fontFamily: 'Poppins_500Medium', marginTop: 1 },

  emptySlots: {
    borderRadius: 16, padding: 36, alignItems: 'center',
  },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', marginTop: 12 },
  emptyHint: { fontSize: 12, marginTop: 4, textAlign: 'center' },

  // Slots list
  slotsList: { gap: 8 },
  slotRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, overflow: 'hidden', minHeight: 68,
  },
  slotAccentBar: { width: 4, alignSelf: 'stretch' },
  slotBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 12 },
  slotTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slotTimeText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  slotRight: { alignItems: 'flex-end', paddingRight: 14, gap: 5 },
  slotPriceText: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  slotBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  slotBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_600SemiBold' },
  cancelHint: { fontSize: 9, fontFamily: 'Poppins_500Medium', marginTop: 3 },

  // Confirm modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  confirmSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0',
    alignSelf: 'center', marginBottom: 20,
  },
  confirmTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  confirmGroundName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 14 },
  confirmInfoBox: { borderRadius: 12, padding: 14, gap: 10, marginBottom: 14 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmDetail: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  priceBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  priceLabel: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  priceValue: { fontSize: 22, fontFamily: 'Poppins_700Bold' },
  payNote: { fontSize: 11, textAlign: 'center', marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  btnSecondary: {
    flex: 1, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5,
  },
  btnSecondaryText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  btnPrimary: {
    flex: 2, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', backgroundColor: '#C8102E',
  },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_700Bold' },
})
