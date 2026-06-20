import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text as RNText, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Modal, Alert, FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import {
  getGroundDetail, getGroundAvailability, createGroundBooking, cancelGroundBooking,
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

// Times stored as UTC "wall clock" — display with UTC methods
function fmtTime(iso) {
  const d = new Date(iso)
  let h = d.getUTCHours()
  const m = d.getUTCMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function to12h(time24) {
  if (!time24) return ''
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function isoMinutes(iso) {
  const d = new Date(iso)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

// ── Time option picker (used inside the booking sheet) ────────────────────────
function TimeOptionModal({ visible, title, options, value, onSelect, onClose, cardBg, textColor, mutedColor, borderColor }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.timeSheet, { backgroundColor: cardBg }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.confirmTitle, { color: textColor }]}>{title}</Text>
          <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
            {options.map((mins) => {
              const t = minutesToTime(mins)
              const active = t === value
              return (
                <TouchableOpacity
                  key={mins}
                  style={[styles.timeOption, { borderBottomColor: borderColor }, active && { backgroundColor: ACCENT + '15' }]}
                  onPress={() => { onSelect(t); onClose() }}
                >
                  <Text style={{ color: active ? ACCENT : textColor, fontSize: 15, fontFamily: active ? 'Poppins_700Bold' : 'Poppins_500Medium' }}>
                    {to12h(t)}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={ACCENT} />}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export default function GroundDetailScreen() {
  const { groundId } = useLocalSearchParams()
  const router = useRouter()
  const myUser = useSelector(s => s.user.user)
  const theme = useSelector(s => s.user.theme)
  const isDark = theme === 'dark'

  const [ground, setGround] = useState(null)
  const [availability, setAvailability] = useState(null)
  const [loading, setLoading] = useState(true)
  const [availLoading, setAvailLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [selectedSport, setSelectedSport] = useState(null)

  const [bookGap, setBookGap] = useState(null) // { startMins, endMins }
  const [bookForm, setBookForm] = useState({ startTime: '', endTime: '', sport: '' })
  const [timePicker, setTimePicker] = useState(null) // null | 'startTime' | 'endTime'
  const [booking, setBooking] = useState(false)

  const [viewBooking, setViewBooking] = useState(null)

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

  const loadAvailability = useCallback(async () => {
    if (!selectedDate) return
    setAvailLoading(true)
    try {
      const data = await getGroundAvailability(groundId, { date: selectedDate })
      setAvailability(data)
    } catch {
      setAvailability(null)
    } finally {
      setAvailLoading(false)
    }
  }, [groundId, selectedDate])

  useEffect(() => { loadGround() }, [loadGround])
  useEffect(() => { if (ground) loadAvailability() }, [ground, loadAvailability])

  const openBookModal = (gap) => {
    const startMins = isoMinutes(gap.startTime)
    const endMins = isoMinutes(gap.endTime)
    setBookGap({ startMins, endMins })
    setBookForm({
      startTime: minutesToTime(startMins),
      endTime: minutesToTime(Math.min(startMins + 30, endMins)),
      sport: selectedSport || ground?.supportedSports?.[0] || '',
    })
  }

  const handleConfirmBooking = async () => {
    if (!bookForm.sport) return Alert.alert('Missing', 'Please select a sport')
    setBooking(true)
    try {
      await createGroundBooking(groundId, {
        sport: bookForm.sport,
        date: selectedDate,
        startTime: bookForm.startTime,
        endTime: bookForm.endTime,
      })
      setBookGap(null)
      loadAvailability()
      Alert.alert('Booked!', 'Your slot has been booked. Pay at venue.')
    } catch (e) {
      Alert.alert('Failed', e.response?.data?.error || 'Booking failed')
    } finally {
      setBooking(false)
    }
  }

  const handleCancel = (item) => {
    Alert.alert('Cancel Booking', 'Cancel this booking?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await cancelGroundBooking(groundId, item.id)
            setViewBooking(null)
            loadAvailability()
          } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to cancel')
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <View style={[styles.header, { backgroundColor: ACCENT }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ground Details</Text>
        </View>
        <ActivityIndicator color={ACCENT} style={{ marginTop: 48 }} />
      </View>
    )
  }

  if (!ground) return null

  // Merge available gaps + existing bookings/blocks into one chronological list
  const items = availability
    ? [
        ...availability.availableSlots.map(s => ({ kind: 'available', startTime: s.startTime, endTime: s.endTime })),
        ...availability.bookings.map(b => ({ kind: 'taken', ...b })),
      ].sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    : []

  const priceFor = (startTime, endTime) => {
    const hrs = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60
    return Math.round(hrs * (ground.pricePerHour || 0))
  }

  const startOptions = bookGap
    ? Array.from({ length: Math.floor((bookGap.endMins - 30 - bookGap.startMins) / 30) + 1 }, (_, i) => bookGap.startMins + i * 30)
    : []
  const curStartMins = bookForm.startTime ? timeToMinutes(bookForm.startTime) : 0
  const endOptions = bookGap
    ? Array.from({ length: Math.floor((bookGap.endMins - (curStartMins + 30)) / 30) + 1 }, (_, i) => curStartMins + 30 + i * 30)
    : []

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header — same style as My Bookings */}
      <View style={[styles.header, { backgroundColor: ACCENT }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{ground.name}</Text>
        {ground.isVerified && (
          <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Ground photo — inside scroll, below header */}
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
          <View style={styles.heroPriceBadge}>
            <Text style={styles.heroPriceText}>₹{ground.pricePerHour}/hr</Text>
          </View>
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
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={mutedColor} />
              <Text style={[styles.metaText, { color: mutedColor }]}>
                {' '}Open {to12h(ground.openTime)} – {to12h(ground.closeTime)} (every day)
              </Text>
            </View>

            {ground.description && (
              <Text style={[styles.description, { color: mutedColor }]}>{ground.description}</Text>
            )}

            {/* Surface + Indoor + Venue type */}
            <View style={[styles.tagsRow, { marginTop: 10 }]}>
              <View style={[styles.tag, { backgroundColor: ACCENT + '12' }]}>
                <Text style={[styles.tagText, { color: ACCENT }]}>
                  {ground.groundType === 'OPEN' ? '🌤️ Open Ground' : '🌱 Turf Ground'}
                </Text>
              </View>
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
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>SPORT TO BOOK</Text>
            <View style={styles.sportsRow}>
              {(ground.supportedSports || []).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sportChip, selectedSport === s && styles.sportChipActive]}
                  onPress={() => setSelectedSport(s)}
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
                <Text style={styles.manageBtnText}>Manage Availability</Text>
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

          {/* Availability */}
          <Text style={[styles.sectionLabel, { marginTop: 4 }]}>AVAILABILITY</Text>
          {availLoading
            ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
            : items.length === 0
              ? (
                <View style={[styles.emptySlots, { backgroundColor: cardBg }]}>
                  <Ionicons name="time-outline" size={44} color="#ccc" />
                  <Text style={[styles.emptyText, { color: mutedColor }]}>No availability for this date</Text>
                </View>
              )
              : (
                <View style={styles.slotsList}>
                  {items.map((item, idx) => {
                    const isPast = new Date(item.endTime) <= new Date()

                    if (item.kind === 'available') {
                      return (
                        <TouchableOpacity
                          key={`a-${idx}`}
                          style={[styles.slotRow, { backgroundColor: isDark ? '#22c55e18' : '#f0fdf4' }]}
                          onPress={() => !isPast && !isOwner && openBookModal(item)}
                          activeOpacity={!isPast && !isOwner ? 0.75 : 1}
                        >
                          <View style={[styles.slotAccentBar, { backgroundColor: '#22c55e' }]} />
                          <View style={styles.slotBody}>
                            <View style={styles.slotTimeRow}>
                              <Ionicons name="time-outline" size={13} color="#22c55e" />
                              <Text style={[styles.slotTimeText, { color: textColor }]}>
                                {fmtTime(item.startTime)} – {fmtTime(item.endTime)}
                              </Text>
                            </View>
                            {!isOwner && !isPast && (
                              <Text style={[styles.cancelHint, { color: '#22c55e' }]}>tap to book</Text>
                            )}
                          </View>
                          <View style={styles.slotRight}>
                            <Text style={[styles.slotPriceText, { color: ACCENT }]}>₹{ground.pricePerHour}/hr</Text>
                            <View style={[styles.slotBadge, { backgroundColor: '#22c55e' }]}>
                              <Text style={styles.slotBadgeText}>{isPast ? 'Past' : 'Available'}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      )
                    }

                    // kind === 'taken'
                    const isMyBooking = item.status === 'BOOKED' && item.bookedById === myUser?.id
                    let accentC = '#3b82f6'
                    let bgTint = isDark ? '#3b82f618' : '#eff6ff'
                    let label = 'Booked'

                    if (item.status === 'BLOCKED') { accentC = '#6b7280'; bgTint = isDark ? '#6b728018' : '#f9fafb'; label = 'Blocked' }
                    else if (isMyBooking) { accentC = '#f59e0b'; bgTint = isDark ? '#f59e0b18' : '#fef9ee'; label = 'Your Booking' }
                    if (isPast) { accentC = '#9ca3af'; bgTint = isDark ? '#ffffff08' : '#f4f4f5'; label = 'Past' }

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.slotRow, { backgroundColor: bgTint }]}
                        onPress={() => { if (isOwner || isMyBooking) setViewBooking(item) }}
                        onLongPress={() => { if (isMyBooking && !isPast) handleCancel(item) }}
                        delayLongPress={500}
                        activeOpacity={isOwner || isMyBooking ? 0.75 : 1}
                      >
                        <View style={[styles.slotAccentBar, { backgroundColor: accentC }]} />
                        <View style={styles.slotBody}>
                          <View style={styles.slotTimeRow}>
                            <Ionicons name="time-outline" size={13} color={accentC} />
                            <Text style={[styles.slotTimeText, { color: textColor }]}>
                              {fmtTime(item.startTime)} – {fmtTime(item.endTime)}
                            </Text>
                          </View>
                          {item.status !== 'BLOCKED' && (
                            <Text style={[styles.cancelHint, { color: mutedColor }]}>
                              {SPORT_EMOJI[item.sport]} {item.sport}
                            </Text>
                          )}
                        </View>
                        <View style={styles.slotRight}>
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

      {/* Booking sheet */}
      <Modal visible={!!bookGap} transparent animationType="fade" onRequestClose={() => setBookGap(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setBookGap(null)} />
          <View style={[styles.confirmSheet, { backgroundColor: cardBg }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.confirmTitle, { color: textColor }]}>Book This Ground</Text>

            {bookGap && (
              <>
                <Text style={[styles.confirmGroundName, { color: textColor }]}>{ground.name}</Text>

                {/* Sport selector */}
                {(ground.supportedSports || []).length > 1 && (
                  <View style={[styles.sportsRow, { marginBottom: 14 }]}>
                    {(ground.supportedSports || []).map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.sportChip, bookForm.sport === s && styles.sportChipActive]}
                        onPress={() => setBookForm(f => ({ ...f, sport: s }))}
                      >
                        <Text style={[styles.sportChipText, { color: bookForm.sport === s ? '#fff' : ACCENT }]}>
                          {SPORT_EMOJI[s]} {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={[styles.confirmInfoBox, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
                  <View style={styles.confirmRow}>
                    <Ionicons name="calendar-outline" size={16} color={mutedColor} />
                    <Text style={[styles.confirmDetail, { color: textColor }]}>{selectedDate}</Text>
                  </View>
                </View>

                {/* Start / End time pickers */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerLabel, { color: mutedColor }]}>START TIME</Text>
                    <TouchableOpacity style={[styles.pickerField, { borderColor }]} onPress={() => setTimePicker('startTime')}>
                      <Ionicons name="time-outline" size={16} color={mutedColor} />
                      <Text style={[styles.pickerText, { color: textColor }]}>{to12h(bookForm.startTime)}</Text>
                      <Ionicons name="chevron-down" size={16} color={mutedColor} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerLabel, { color: mutedColor }]}>END TIME</Text>
                    <TouchableOpacity style={[styles.pickerField, { borderColor }]} onPress={() => setTimePicker('endTime')}>
                      <Ionicons name="time-outline" size={16} color={mutedColor} />
                      <Text style={[styles.pickerText, { color: textColor }]}>{to12h(bookForm.endTime)}</Text>
                      <Ionicons name="chevron-down" size={16} color={mutedColor} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.priceBox, { backgroundColor: ACCENT + '12' }]}>
                  <Text style={[styles.priceLabel, { color: mutedColor }]}>Total Amount</Text>
                  <Text style={[styles.priceValue, { color: ACCENT }]}>₹{priceFor(bookForm.startTime, bookForm.endTime)}</Text>
                </View>
                <Text style={[styles.payNote, { color: mutedColor }]}>💵 Payment collected at the venue · Min 30 min</Text>
              </>
            )}

            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor }]}
                onPress={() => setBookGap(null)}
              >
                <Text style={[styles.btnSecondaryText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleConfirmBooking} disabled={booking}>
                {booking
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Book Now</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Start time picker */}
      <TimeOptionModal
        visible={timePicker === 'startTime'}
        title="Start Time"
        options={startOptions}
        value={bookForm.startTime}
        onSelect={(t) => {
          setBookForm(f => {
            const newStartMins = timeToMinutes(t)
            const curEndMins = timeToMinutes(f.endTime)
            const endTime = curEndMins <= newStartMins ? minutesToTime(Math.min(newStartMins + 30, bookGap.endMins)) : f.endTime
            return { ...f, startTime: t, endTime }
          })
        }}
        onClose={() => setTimePicker(null)}
        cardBg={cardBg} textColor={textColor} mutedColor={mutedColor} borderColor={borderColor}
      />

      {/* End time picker */}
      <TimeOptionModal
        visible={timePicker === 'endTime'}
        title="End Time"
        options={endOptions}
        value={bookForm.endTime}
        onSelect={(t) => setBookForm(f => ({ ...f, endTime: t }))}
        onClose={() => setTimePicker(null)}
        cardBg={cardBg} textColor={textColor} mutedColor={mutedColor} borderColor={borderColor}
      />

      {/* Booking / block detail modal */}
      <Modal visible={!!viewBooking} transparent animationType="fade" onRequestClose={() => setViewBooking(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setViewBooking(null)} />
          <View style={[styles.confirmSheet, { backgroundColor: cardBg }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.confirmTitle, { color: textColor }]}>
              {viewBooking?.status === 'BLOCKED' ? 'Blocked Time' : 'Booking Details'}
            </Text>
            {viewBooking && (
              <>
                <View style={[styles.confirmInfoBox, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
                  <View style={styles.confirmRow}>
                    <Ionicons name="time-outline" size={16} color={mutedColor} />
                    <Text style={[styles.confirmDetail, { color: textColor }]}>
                      {fmtTime(viewBooking.startTime)} – {fmtTime(viewBooking.endTime)}
                    </Text>
                  </View>
                  {viewBooking.status !== 'BLOCKED' && (
                    <View style={styles.confirmRow}>
                      <Text style={{ fontSize: 16 }}>{SPORT_EMOJI[viewBooking.sport]}</Text>
                      <Text style={[styles.confirmDetail, { color: textColor }]}>{viewBooking.sport}</Text>
                    </View>
                  )}
                  {viewBooking.status !== 'BLOCKED' && (
                    <View style={styles.confirmRow}>
                      <Ionicons name="cash-outline" size={16} color={mutedColor} />
                      <Text style={[styles.confirmDetail, { color: ACCENT }]}>
                        ₹{priceFor(minutesToTime(isoMinutes(viewBooking.startTime)), minutesToTime(isoMinutes(viewBooking.endTime)))}
                      </Text>
                    </View>
                  )}
                  {isOwner && viewBooking.bookedBy && (
                    <>
                      <View style={styles.confirmRow}>
                        <Ionicons name="person-circle-outline" size={16} color='#3b82f6' />
                        <Text style={[styles.confirmDetail, { color: '#3b82f6' }]}>{viewBooking.bookedBy.fullName}</Text>
                      </View>
                      {viewBooking.bookedBy.phone && (
                        <View style={styles.confirmRow}>
                          <Ionicons name="call-outline" size={16} color='#3b82f6' />
                          <Text style={[styles.confirmDetail, { color: '#3b82f6' }]}>{viewBooking.bookedBy.phone}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                {viewBooking.status === 'BOOKED' && viewBooking.bookedById === myUser?.id && new Date(viewBooking.startTime) > new Date() && (
                  <TouchableOpacity style={styles.cancelBookingBtn} onPress={() => handleCancel(viewBooking)}>
                    <Ionicons name="close-circle" size={17} color="#fff" />
                    <Text style={styles.cancelBookingBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0', marginTop: 4 }]}
              onPress={() => setViewBooking(null)}
            >
              <Text style={[styles.closeBtnText, { color: textColor }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 14,
  },
  headerBack: { padding: 4 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },

  heroWrap: { position: 'relative', height: 210 },
  heroImg: { width: '100%', height: '100%' },
  heroFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  heroPriceBadge: {
    position: 'absolute', bottom: 12, left: 14,
    backgroundColor: '#C8102E', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroPriceText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_700Bold' },

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
  slotPriceText: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
  slotBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  slotBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_600SemiBold' },
  cancelHint: { fontSize: 11, fontFamily: 'Poppins_500Medium', marginTop: 3 },

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

  cancelBookingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#ef4444',
    borderRadius: 14, paddingVertical: 14, marginBottom: 10,
  },
  cancelBookingBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_700Bold' },
  closeBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  // Time picker fields (booking sheet)
  pickerLabel: { fontSize: 10, fontFamily: 'Poppins_700Bold', letterSpacing: 0.8, marginBottom: 6 },
  pickerField: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 12, borderWidth: 1.5,
  },
  pickerText: { flex: 1, fontSize: 14, fontFamily: 'Poppins_500Medium' },

  // Time option list modal
  timeSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
  },
  timeOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 0.5,
  },
})
