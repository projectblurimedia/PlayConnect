import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text as RNText, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Modal, Alert, FlatList, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import {
  getGroundDetail, getGroundAvailability, createGroundBlock,
  deleteGroundBlock, cancelGroundBooking, blockGroundDay,
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

function getDays(n = 30) {
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

// ── Time option picker (used inside the block sheet) ───────────────────────────
function TimeOptionModal({ visible, title, options, value, onSelect, onClose, cardBg, textColor, borderColor }) {
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

export default function ManageSlotsScreen() {
  const { groundId } = useLocalSearchParams()
  const router = useRouter()
  const theme = useSelector(s => s.user.theme)
  const isDark = theme === 'dark'

  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'
  const borderColor = isDark ? '#2a2a2a' : '#e5e7eb'

  const [ground, setGround] = useState(null)
  const [availability, setAvailability] = useState(null)
  const [loading, setLoading] = useState(true)
  const [availLoading, setAvailLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))

  const [blockGap, setBlockGap] = useState(null) // { startMins, endMins }
  const [blockForm, setBlockForm] = useState({ startTime: '', endTime: '' })
  const [timePicker, setTimePicker] = useState(null) // null | 'startTime' | 'endTime'
  const [saving, setSaving] = useState(false)

  const [viewItem, setViewItem] = useState(null)
  const [blockingDay, setBlockingDay] = useState(false)

  const days = getDays(30)

  const loadGround = useCallback(async () => {
    try {
      const data = await getGroundDetail(groundId)
      setGround(data.ground)
    } catch {
      Alert.alert('Error', 'Failed to load ground')
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

  const onRefresh = async () => {
    setRefreshing(true)
    await loadAvailability()
    setRefreshing(false)
  }

  const openBlockSheet = (gap) => {
    const startMins = isoMinutes(gap.startTime)
    const endMins = isoMinutes(gap.endTime)
    setBlockGap({ startMins, endMins })
    setBlockForm({
      startTime: minutesToTime(startMins),
      endTime: minutesToTime(Math.min(startMins + 30, endMins)),
    })
  }

  const handleConfirmBlock = async () => {
    setSaving(true)
    try {
      await createGroundBlock(groundId, {
        date: selectedDate,
        startTime: blockForm.startTime,
        endTime: blockForm.endTime,
      })
      setBlockGap(null)
      loadAvailability()
    } catch (e) {
      Alert.alert('Failed', e.response?.data?.error || 'Could not block this time')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveBlock = (item) => {
    Alert.alert('Remove Block', 'Make this time available again?', [
      { text: 'No' },
      {
        text: 'Yes, Remove', style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroundBlock(groundId, item.id)
            setViewItem(null)
            loadAvailability()
          } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to remove block')
          }
        },
      },
    ])
  }

  const handleCancelBooking = (item) => {
    Alert.alert(
      'Cancel Booking',
      'Free up this slot? Use this if the player didn\'t show up or there\'s an issue with this booking.',
      [
        { text: 'No' },
        {
          text: 'Yes, Cancel', style: 'destructive',
          onPress: async () => {
            try {
              await cancelGroundBooking(groundId, item.id)
              setViewItem(null)
              loadAvailability()
            } catch (e) {
              Alert.alert('Error', e.response?.data?.error || 'Failed to cancel booking')
            }
          },
        },
      ]
    )
  }

  const handleLongPressBooking = (item) => {
    Alert.alert(
      'Free This Slot?',
      `${fmtTime(item.startTime)} – ${fmtTime(item.endTime)}\nBooked by: ${item.bookedBy?.fullName || 'Player'}\n\nCancel this booking and make the slot available again?`,
      [
        { text: 'Keep' },
        {
          text: 'Free Slot', style: 'destructive',
          onPress: async () => {
            try {
              await cancelGroundBooking(groundId, item.id)
              loadAvailability()
            } catch (e) {
              Alert.alert('Error', e.response?.data?.error || 'Failed to free slot')
            }
          },
        },
      ]
    )
  }

  const handleBlockDay = () => {
    const hasBookings = (availability?.bookings || []).some(b => b.status === 'BOOKED')
    Alert.alert(
      'Block Entire Day',
      hasBookings
        ? `Block all slots for ${selectedDate}?\n\nThis will cancel ALL existing bookings for this day and make the ground unavailable.`
        : `Block all slots for ${selectedDate}?\n\nNo players will be able to book this day.`,
      [
        { text: 'No' },
        {
          text: 'Block Day', style: 'destructive',
          onPress: async () => {
            setBlockingDay(true)
            try {
              await blockGroundDay(groundId, selectedDate)
              loadAvailability()
            } catch (e) {
              Alert.alert('Error', e.response?.data?.error || 'Failed to block day')
            } finally {
              setBlockingDay(false)
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
        <ActivityIndicator color={ACCENT} size="large" />
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

  const bookedCount = (availability?.bookings || []).filter(b => b.status === 'BOOKED').length

  const startOptions = blockGap
    ? Array.from({ length: Math.floor((blockGap.endMins - 30 - blockGap.startMins) / 30) + 1 }, (_, i) => blockGap.startMins + i * 30)
    : []
  const curStartMins = blockForm.startTime ? timeToMinutes(blockForm.startTime) : 0
  const endOptions = blockGap
    ? Array.from({ length: Math.floor((blockGap.endMins - (curStartMins + 30)) / 30) + 1 }, (_, i) => curStartMins + 30 + i * 30)
    : []

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: ACCENT }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Manage Availability</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{ground.name}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        <View style={{ padding: 14, gap: 14 }}>

          {/* Ground info card */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.groundHeaderRow}>
              {ground.photos?.[0]
                ? <Image source={{ uri: ground.photos[0] }} style={styles.groundThumb} />
                : (
                  <View style={[styles.groundThumb, styles.groundThumbFallback, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                    <Ionicons name="location" size={24} color="#ccc" />
                  </View>
                )
              }
              <View style={{ flex: 1 }}>
                <Text style={[styles.groundName, { color: textColor }]} numberOfLines={1}>{ground.name}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={12} color={mutedColor} />
                  <Text style={[styles.metaText, { color: mutedColor }]} numberOfLines={1}> {ground.city}, {ground.state}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={12} color={mutedColor} />
                  <Text style={[styles.metaText, { color: mutedColor }]}>
                    {' '}Open {to12h(ground.openTime)} – {to12h(ground.closeTime)} · ₹{ground.pricePerHour}/hr
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.tagsRow, { marginTop: 10 }]}>
              <View style={[styles.tag, { backgroundColor: ACCENT + '12' }]}>
                <Text style={[styles.tagText, { color: ACCENT }]}>
                  {ground.groundType === 'OPEN' ? '🌤️ Open Ground' : '🌱 Turf Ground'}
                </Text>
              </View>
              {(ground.supportedSports || []).map(s => (
                <View key={s} style={[styles.tag, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                  <Text style={[styles.tagText, { color: textColor }]}>{SPORT_EMOJI[s]} {s}</Text>
                </View>
              ))}
            </View>
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

          {/* Bookings / availability */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>SCHEDULE</Text>
            <Text style={[styles.bookedCount, { color: mutedColor }]}>{bookedCount} booking{bookedCount !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            style={[styles.blockDayBtn, blockingDay && { opacity: 0.6 }]}
            onPress={handleBlockDay}
            disabled={blockingDay}
            activeOpacity={0.75}
          >
            {blockingDay
              ? <ActivityIndicator size="small" color="#ef4444" />
              : <Ionicons name="ban-outline" size={15} color="#ef4444" />
            }
            <Text style={styles.blockDayBtnText}>Block Entire Day</Text>
          </TouchableOpacity>
          <Text style={[styles.hint, { color: mutedColor }]}>Tap free slot to block • Tap booking to manage • Long-press booking to free it</Text>

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
                          onPress={() => !isPast && openBlockSheet(item)}
                          activeOpacity={!isPast ? 0.75 : 1}
                        >
                          <View style={[styles.slotAccentBar, { backgroundColor: '#22c55e' }]} />
                          <View style={styles.slotBody}>
                            <View style={styles.slotTimeRow}>
                              <Ionicons name="time-outline" size={13} color="#22c55e" />
                              <Text style={[styles.slotTimeText, { color: textColor }]}>
                                {fmtTime(item.startTime)} – {fmtTime(item.endTime)}
                              </Text>
                            </View>
                            {!isPast && (
                              <Text style={[styles.cancelHint, { color: '#22c55e' }]}>tap to block</Text>
                            )}
                          </View>
                          <View style={styles.slotRight}>
                            <View style={[styles.slotBadge, { backgroundColor: '#22c55e' }]}>
                              <Text style={styles.slotBadgeText}>{isPast ? 'Past' : 'Free'}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      )
                    }

                    // kind === 'taken'
                    let accentC = '#3b82f6'
                    let bgTint = isDark ? '#3b82f618' : '#eff6ff'
                    let label = 'Booked'

                    if (item.status === 'BLOCKED') { accentC = '#6b7280'; bgTint = isDark ? '#6b728018' : '#f9fafb'; label = 'Blocked' }
                    if (isPast) { accentC = '#9ca3af'; bgTint = isDark ? '#ffffff08' : '#f4f4f5'; label = `Past · ${label}` }

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.slotRow, { backgroundColor: bgTint }]}
                        onPress={() => setViewItem(item)}
                        onLongPress={() => item.status === 'BOOKED' && handleLongPressBooking(item)}
                        delayLongPress={400}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.slotAccentBar, { backgroundColor: accentC }]} />
                        <View style={styles.slotBody}>
                          <View style={styles.slotTimeRow}>
                            <Ionicons name="time-outline" size={13} color={accentC} />
                            <Text style={[styles.slotTimeText, { color: textColor }]}>
                              {fmtTime(item.startTime)} – {fmtTime(item.endTime)}
                            </Text>
                          </View>
                          {item.status === 'BOOKED'
                            ? (
                              <Text style={[styles.cancelHint, { color: mutedColor }]}>
                                {SPORT_EMOJI[item.sport]} {item.bookedBy?.fullName || 'Player'}
                              </Text>
                            )
                            : (
                              <Text style={[styles.cancelHint, { color: mutedColor }]}>tap to manage</Text>
                            )
                          }
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

      {/* Block time sheet */}
      <Modal visible={!!blockGap} transparent animationType="fade" onRequestClose={() => setBlockGap(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setBlockGap(null)} />
          <View style={[styles.confirmSheet, { backgroundColor: cardBg }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.confirmTitle, { color: textColor }]}>Block This Time</Text>
            <Text style={[styles.confirmGroundName, { color: mutedColor }]}>
              Players won&apos;t be able to book this time slot
            </Text>

            <View style={[styles.confirmInfoBox, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
              <View style={styles.confirmRow}>
                <Ionicons name="calendar-outline" size={16} color={mutedColor} />
                <Text style={[styles.confirmDetail, { color: textColor }]}>{selectedDate}</Text>
              </View>
            </View>

            {/* Start / End time pickers */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerLabel, { color: mutedColor }]}>START TIME</Text>
                <TouchableOpacity style={[styles.pickerField, { borderColor }]} onPress={() => setTimePicker('startTime')}>
                  <Ionicons name="time-outline" size={16} color={mutedColor} />
                  <Text style={[styles.pickerText, { color: textColor }]}>{to12h(blockForm.startTime)}</Text>
                  <Ionicons name="chevron-down" size={16} color={mutedColor} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerLabel, { color: mutedColor }]}>END TIME</Text>
                <TouchableOpacity style={[styles.pickerField, { borderColor }]} onPress={() => setTimePicker('endTime')}>
                  <Ionicons name="time-outline" size={16} color={mutedColor} />
                  <Text style={[styles.pickerText, { color: textColor }]}>{to12h(blockForm.endTime)}</Text>
                  <Ionicons name="chevron-down" size={16} color={mutedColor} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.confirmBtns}>
              <TouchableOpacity style={[styles.btnSecondary, { borderColor }]} onPress={() => setBlockGap(null)}>
                <Text style={[styles.btnSecondaryText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#6b7280' }]} onPress={handleConfirmBlock} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Block Time</Text>
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
        value={blockForm.startTime}
        onSelect={(t) => {
          setBlockForm(f => {
            const newStartMins = timeToMinutes(t)
            const curEndMins = timeToMinutes(f.endTime)
            const endTime = curEndMins <= newStartMins ? minutesToTime(Math.min(newStartMins + 30, blockGap.endMins)) : f.endTime
            return { ...f, startTime: t, endTime }
          })
        }}
        onClose={() => setTimePicker(null)}
        cardBg={cardBg} textColor={textColor} borderColor={borderColor}
      />

      {/* End time picker */}
      <TimeOptionModal
        visible={timePicker === 'endTime'}
        title="End Time"
        options={endOptions}
        value={blockForm.endTime}
        onSelect={(t) => setBlockForm(f => ({ ...f, endTime: t }))}
        onClose={() => setTimePicker(null)}
        cardBg={cardBg} textColor={textColor} borderColor={borderColor}
      />

      {/* Booking / block detail modal */}
      <Modal visible={!!viewItem} transparent animationType="fade" onRequestClose={() => setViewItem(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setViewItem(null)} />
          <View style={[styles.confirmSheet, { backgroundColor: cardBg }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.confirmTitle, { color: textColor }]}>
              {viewItem?.status === 'BLOCKED' ? 'Blocked Time' : 'Booking Details'}
            </Text>
            {viewItem && (
              <>
                <View style={[styles.confirmInfoBox, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
                  <View style={styles.confirmRow}>
                    <Ionicons name="time-outline" size={16} color={mutedColor} />
                    <Text style={[styles.confirmDetail, { color: textColor }]}>
                      {fmtTime(viewItem.startTime)} – {fmtTime(viewItem.endTime)}
                    </Text>
                  </View>
                  {viewItem.status === 'BOOKED' && (
                    <>
                      <View style={styles.confirmRow}>
                        <Text style={{ fontSize: 16 }}>{SPORT_EMOJI[viewItem.sport]}</Text>
                        <Text style={[styles.confirmDetail, { color: textColor }]}>{viewItem.sport}</Text>
                      </View>
                      {viewItem.bookedBy && (
                        <>
                          <View style={styles.confirmRow}>
                            <Ionicons name="person-circle-outline" size={16} color='#3b82f6' />
                            <Text style={[styles.confirmDetail, { color: '#3b82f6' }]}>{viewItem.bookedBy.fullName}</Text>
                          </View>
                          {viewItem.bookedBy.phone && (
                            <View style={styles.confirmRow}>
                              <Ionicons name="call-outline" size={16} color='#3b82f6' />
                              <Text style={[styles.confirmDetail, { color: '#3b82f6' }]}>{viewItem.bookedBy.phone}</Text>
                            </View>
                          )}
                        </>
                      )}
                    </>
                  )}
                </View>

                {viewItem.status === 'BOOKED' && (
                  <TouchableOpacity style={styles.cancelBookingBtn} onPress={() => handleCancelBooking(viewItem)}>
                    <Ionicons name="close-circle" size={17} color="#fff" />
                    <Text style={styles.cancelBookingBtnText}>Cancel Booking (No-show)</Text>
                  </TouchableOpacity>
                )}
                {viewItem.status === 'BLOCKED' && (
                  <TouchableOpacity style={styles.removeBlockBtn} onPress={() => handleRemoveBlock(viewItem)}>
                    <Ionicons name="checkmark-circle" size={17} color="#fff" />
                    <Text style={styles.removeBlockBtnText}>Remove Block</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0', marginTop: 4 }]}
              onPress={() => setViewItem(null)}
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
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 14,
  },
  headerBack: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },

  card: {
    borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  groundHeaderRow: { flexDirection: 'row', gap: 12 },
  groundThumb: { width: 64, height: 64, borderRadius: 12 },
  groundThumbFallback: { justifyContent: 'center', alignItems: 'center' },
  groundName: { fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  metaText: { fontSize: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, fontFamily: 'Poppins_500Medium' },

  sectionLabel: {
    fontSize: 11, fontFamily: 'Poppins_700Bold', color: ACCENT,
    letterSpacing: 1, marginBottom: 10,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  bookedCount: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  hint: { fontSize: 11.5, marginTop: -4, marginBottom: 4 },
  blockDayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: '#ef444415',
    alignSelf: 'flex-start', marginBottom: 4,
  },
  blockDayBtnText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#ef4444' },

  dateChip: {
    width: 60, paddingVertical: 10, borderRadius: 14,
    alignItems: 'center', borderWidth: 1.5,
  },
  dateDayName: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  dateNum: { fontSize: 18, fontFamily: 'Poppins_700Bold', lineHeight: 22 },
  dateMonth: { fontSize: 9, fontFamily: 'Poppins_500Medium', marginTop: 1 },

  emptySlots: { borderRadius: 16, padding: 36, alignItems: 'center' },
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
  slotBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  slotBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_600SemiBold' },
  cancelHint: { fontSize: 11, fontFamily: 'Poppins_500Medium', marginTop: 3 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  confirmSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 20 },
  confirmTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  confirmGroundName: { fontSize: 13, fontFamily: 'Poppins_400Regular', marginBottom: 14 },
  confirmInfoBox: { borderRadius: 12, padding: 14, gap: 10, marginBottom: 14 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmDetail: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  btnSecondary: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5 },
  btnSecondaryText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  btnPrimary: {
    flex: 2, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
    backgroundColor: '#C8102E',
  },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_700Bold' },

  cancelBookingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#ef4444',
    borderRadius: 14, paddingVertical: 14, marginBottom: 10,
  },
  cancelBookingBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_700Bold' },
  removeBlockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#22c55e',
    borderRadius: 14, paddingVertical: 14, marginBottom: 10,
  },
  removeBlockBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_700Bold' },
  closeBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  // Time picker fields
  pickerLabel: { fontSize: 10, fontFamily: 'Poppins_700Bold', letterSpacing: 0.8, marginBottom: 6 },
  pickerField: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, borderWidth: 1.5 },
  pickerText: { flex: 1, fontSize: 14, fontFamily: 'Poppins_500Medium' },

  // Time option list modal
  timeSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  timeOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 0.5 },
})
