import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text as RNText, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert, FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import {
  getGroundDetail, getGroundSlots, createGroundSlots,
  deleteGroundSlot, updateGroundSlotStatus,
} from '../../services/api'

const ACCENT = '#C8102E'
const SPORT_EMOJI = {
  CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', BADMINTON: '🏸',
  VOLLEYBALL: '🏐', KABADDI: '🤼', TENNIS: '🎾', OTHER: '🏃',
}
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DURATION_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '1.5 hr', value: 90 },
  { label: '2 hr', value: 120 },
]

// Times every 30 min from 05:00 to 23:30 (stored as 24-hr, displayed as 12-hr)
const TIME_OPTIONS = []
for (let h = 5; h <= 23; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 23) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`)
}

// "06:30" → "6:30 AM",  "14:00" → "2:00 PM"
function to12h(time24) {
  if (!time24) return ''
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

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

// ── Time Picker Modal ──────────────────────────────────────────────────────────
function TimePickerModal({ visible, title, value, onSelect, onClose, isDark, cardBg, textColor, mutedColor }) {
  const borderColor = isDark ? '#2a2a2a' : '#e5e7eb'
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}>
            <Text style={{ fontSize: 16, fontFamily: 'Poppins_700Bold', color: textColor }}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={mutedColor} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={TIME_OPTIONS}
            keyExtractor={t => t}
            style={{ maxHeight: 280 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { onSelect(item); onClose() }}
                style={{ padding: 14, backgroundColor: item === value ? ACCENT + '15' : 'transparent', borderBottomWidth: 0.5, borderBottomColor: borderColor, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={{ color: item === value ? ACCENT : textColor, fontFamily: item === value ? 'Poppins_700Bold' : 'Poppins_400Regular', fontSize: 15 }}>
                  {to12h(item)}
                </Text>
                <Text style={{ color: mutedColor, fontSize: 12 }}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  )
}

// ── Date Picker Modal ──────────────────────────────────────────────────────────
function DatePickerModal({ visible, title, value, onSelect, onClose, isDark, cardBg, textColor, mutedColor }) {
  const borderColor = isDark ? '#2a2a2a' : '#e5e7eb'
  const days = getDays(60)
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}>
            <Text style={{ fontSize: 16, fontFamily: 'Poppins_700Bold', color: textColor }}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={mutedColor} /></TouchableOpacity>
          </View>
          <FlatList
            data={days}
            keyExtractor={d => formatDate(d)}
            style={{ maxHeight: 280 }}
            renderItem={({ item: d }) => {
              const ds = formatDate(d)
              const isSelected = ds === value
              return (
                <TouchableOpacity
                  onPress={() => { onSelect(ds); onClose() }}
                  style={{ padding: 14, backgroundColor: isSelected ? ACCENT + '15' : 'transparent', borderBottomWidth: 0.5, borderBottomColor: borderColor, flexDirection: 'row', justifyContent: 'space-between' }}
                >
                  <Text style={{ color: isSelected ? ACCENT : textColor, fontFamily: isSelected ? 'Poppins_700Bold' : 'Poppins_400Regular', fontSize: 14 }}>
                    {DAY_NAMES[d.getDay()]}, {d.getDate()} {MONTH_NAMES[d.getMonth()]} {d.getFullYear()}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color={ACCENT} />}
                </TouchableOpacity>
              )
            }}
          />
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
  const inputBg = isDark ? '#2a2a2a' : '#f8f9fa'

  const [ground, setGround] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [showAddModal, setShowAddModal] = useState(false)
  const days = getDays(30)

  // Add slots form state
  const [mode, setMode] = useState('single') // single | bulk
  const [form, setForm] = useState({
    sport: '', date: formatDate(new Date()), fromDate: formatDate(new Date()), toDate: formatDate(new Date()),
    startTime: '06:00', endTime: '07:00', slotDurationMins: 60, priceOverride: '',
  })
  const [saving, setSaving] = useState(false)

  // Picker modals
  const [picker, setPicker] = useState(null) // null | 'startTime' | 'endTime' | 'date' | 'fromDate' | 'toDate'

  const loadGround = useCallback(async () => {
    try {
      const data = await getGroundDetail(groundId)
      setGround(data.ground)
      if (data.ground.supportedSports?.[0]) setForm(f => ({ ...f, sport: data.ground.supportedSports[0] }))
    } catch {
      Alert.alert('Error', 'Failed to load ground')
    } finally {
      setLoading(false)
    }
  }, [groundId])

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true)
    try {
      const data = await getGroundSlots(groundId, { date: selectedDate })
      setSlots(data.slots || [])
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [groundId, selectedDate])

  useEffect(() => { loadGround() }, [loadGround])
  useEffect(() => { if (ground) loadSlots() }, [ground, loadSlots])

  const handleSaveSlots = async () => {
    if (!form.sport) return Alert.alert('Missing', 'Please select a sport')
    setSaving(true)
    try {
      const payload = {
        sport: form.sport,
        startTime: form.startTime,
        endTime: form.endTime,
        priceOverride: form.priceOverride ? parseFloat(form.priceOverride) : undefined,
      }
      if (mode === 'single') {
        payload.date = form.date
      } else {
        payload.fromDate = form.fromDate
        payload.toDate = form.toDate
        payload.slotDurationMins = form.slotDurationMins
      }
      const result = await createGroundSlots(groundId, payload)
      Alert.alert('Success', result.message)
      setShowAddModal(false)
      loadSlots()
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to create slots')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (slot) => {
    const newStatus = slot.status === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE'
    try {
      await updateGroundSlotStatus(groundId, slot.id, newStatus)
      loadSlots()
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to update slot')
    }
  }

  const handleDelete = (slot) => {
    Alert.alert('Delete Slot', `Delete ${fmtTime(slot.startTime)} – ${fmtTime(slot.endTime)} slot?`, [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroundSlot(groundId, slot.id)
            loadSlots()
          } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to delete')
          }
        },
      },
    ])
  }

  // ── Slot card render ──────────────────────────────────────────────────────────
  const renderSlot = (slot) => {
    const isPast = new Date(slot.startTime) < new Date()
    const bookerName = slot.bookedBy?.fullName
    const bookerPhone = slot.bookedBy?.phone

    let leftColor = '#22c55e'
    let statusText = 'Available'
    let statusColor = '#22c55e'

    if (slot.status === 'BOOKED') { leftColor = '#3b82f6'; statusText = 'Booked'; statusColor = '#3b82f6' }
    else if (slot.status === 'BLOCKED') { leftColor = '#6b7280'; statusText = 'Blocked'; statusColor = '#6b7280' }
    if (isPast && slot.status !== 'BOOKED') { leftColor = '#9ca3af'; statusColor = '#9ca3af'; statusText = 'Past' }

    const price = slot.priceOverride ?? ground?.pricePerHour
    const hrs = (new Date(slot.endTime) - new Date(slot.startTime)) / 3600000
    const total = Math.round(price * hrs)

    return (
      <View key={slot.id} style={[styles.slotCard, { backgroundColor: cardBg, borderLeftColor: leftColor }]}>
        {/* Row 1: time — price */}
        <View style={styles.slotRow1}>
          <Text style={[styles.slotTime, { color: textColor }]}>
            {fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}
          </Text>
          <Text style={[styles.slotPrice, { color: ACCENT }]}>₹{total}</Text>
        </View>

        {/* Row 2: booker name (or empty) — status badge + actions */}
        <View style={styles.slotRow2}>
          {bookerName
            ? (
              <View style={styles.bookerRow}>
                <Ionicons name="person-circle-outline" size={14} color='#3b82f6' />
                <Text style={[styles.bookerName, { color: '#3b82f6' }]}>{bookerName}</Text>
              </View>
            )
            : <View />
          }
          <View style={styles.slotRowRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
            {!isPast && slot.status !== 'BOOKED' && (
              <View style={styles.slotActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: (slot.status === 'AVAILABLE' ? '#f59e0b' : '#22c55e') + '18' }]}
                  onPress={() => handleToggleStatus(slot)}
                >
                  <Ionicons
                    name={slot.status === 'AVAILABLE' ? 'ban-outline' : 'checkmark-circle-outline'}
                    size={18}
                    color={slot.status === 'AVAILABLE' ? '#f59e0b' : '#22c55e'}
                  />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#ef444418' }]}
                onPress={() => handleDelete(slot)}
              >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Row 3: phone — sport (only when booked or sport present) */}
        {(bookerPhone || slot.sport) && (
          <View style={styles.slotRow3}>
            {bookerPhone
              ? (
                <View style={styles.bookerRow}>
                  <Ionicons name="call-outline" size={12} color='#3b82f6' />
                  <Text style={[styles.bookerPhone, { color: '#3b82f6' }]}>{bookerPhone}</Text>
                </View>
              )
              : <View />
            }
            <View style={styles.sportRow}>
              <Text style={{ fontSize: 13 }}>{SPORT_EMOJI[slot.sport]}</Text>
              <Text style={[styles.slotSport, { color: mutedColor }]}>{slot.sport}</Text>
            </View>
          </View>
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: ACCENT }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Manage Slots</Text>
          {ground && <Text style={styles.headerSub}>{ground.name}</Text>}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Date selector */}
        <View style={{ padding: 14 }}>
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
        </View>

        {/* Slots list */}
        <View style={{ paddingHorizontal: 14 }}>
          <View style={styles.slotsTitleRow}>
            <Text style={styles.sectionLabel}>SLOTS — {selectedDate}</Text>
            <Text style={[styles.slotCount, { color: mutedColor }]}>{slots.length} slot{slots.length !== 1 ? 's' : ''}</Text>
          </View>

          {slotsLoading
            ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
            : slots.length === 0
              ? (
                <View style={[styles.emptyBox, { backgroundColor: cardBg }]}>
                  <Ionicons name="time-outline" size={44} color="#ccc" />
                  <Text style={[styles.emptyText, { color: mutedColor }]}>No slots for this date</Text>
                  <Text style={[styles.emptyHint, { color: mutedColor }]}>Tap + to add slots</Text>
                </View>
              )
              : slots.map(s => renderSlot(s))
          }
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setForm(f => ({ ...f, date: selectedDate, fromDate: selectedDate }))
          setShowAddModal(true)
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Slots Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowAddModal(false)} />
          <View style={[styles.addSheet, { backgroundColor: cardBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: textColor }]}>Add Slots</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={mutedColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Mode toggle */}
              <View style={[styles.modeToggle, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                {['single', 'bulk'].map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                    onPress={() => setMode(m)}
                  >
                    <Text style={[styles.modeBtnText, { color: mode === m ? '#fff' : mutedColor }]}>
                      {m === 'single' ? 'Single Day' : 'Multiple Days'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sport selector */}
              <Text style={[styles.label, { color: mutedColor }]}>SPORT *</Text>
              <View style={styles.sportsRow}>
                {(ground?.supportedSports || []).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sportChip, { borderColor: form.sport === s ? ACCENT : borderColor, backgroundColor: form.sport === s ? ACCENT + '15' : 'transparent' }]}
                    onPress={() => setForm(f => ({ ...f, sport: s }))}
                  >
                    <Text style={[styles.sportChipText, { color: form.sport === s ? ACCENT : mutedColor }]}>
                      {SPORT_EMOJI[s]} {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date(s) */}
              {mode === 'single'
                ? (
                  <>
                    <Text style={[styles.label, { color: mutedColor }]}>DATE *</Text>
                    <TouchableOpacity style={[styles.pickerField, { backgroundColor: inputBg, borderColor }]} onPress={() => setPicker('date')}>
                      <Ionicons name="calendar-outline" size={18} color={mutedColor} />
                      <Text style={[styles.pickerText, { color: textColor }]}>{form.date}</Text>
                      <Ionicons name="chevron-down" size={16} color={mutedColor} />
                    </TouchableOpacity>
                  </>
                )
                : (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: mutedColor }]}>FROM *</Text>
                      <TouchableOpacity style={[styles.pickerField, { backgroundColor: inputBg, borderColor }]} onPress={() => setPicker('fromDate')}>
                        <Text style={[styles.pickerText, { color: textColor }]}>{form.fromDate}</Text>
                        <Ionicons name="chevron-down" size={16} color={mutedColor} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: mutedColor }]}>TO *</Text>
                      <TouchableOpacity style={[styles.pickerField, { backgroundColor: inputBg, borderColor }]} onPress={() => setPicker('toDate')}>
                        <Text style={[styles.pickerText, { color: textColor }]}>{form.toDate}</Text>
                        <Ionicons name="chevron-down" size={16} color={mutedColor} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              }

              {/* Time range */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: mutedColor }]}>START TIME *</Text>
                  <TouchableOpacity style={[styles.pickerField, { backgroundColor: inputBg, borderColor }]} onPress={() => setPicker('startTime')}>
                    <Ionicons name="time-outline" size={16} color={mutedColor} />
                    <Text style={[styles.pickerText, { color: textColor }]}>{to12h(form.startTime)}</Text>
                    <Ionicons name="chevron-down" size={16} color={mutedColor} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: mutedColor }]}>END TIME *</Text>
                  <TouchableOpacity style={[styles.pickerField, { backgroundColor: inputBg, borderColor }]} onPress={() => setPicker('endTime')}>
                    <Ionicons name="time-outline" size={16} color={mutedColor} />
                    <Text style={[styles.pickerText, { color: textColor }]}>{to12h(form.endTime)}</Text>
                    <Ionicons name="chevron-down" size={16} color={mutedColor} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Slot duration (bulk only) */}
              {mode === 'bulk' && (
                <>
                  <Text style={[styles.label, { color: mutedColor }]}>SLOT DURATION</Text>
                  <View style={styles.durationRow}>
                    {DURATION_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.durationChip, { borderColor: form.slotDurationMins === opt.value ? ACCENT : borderColor, backgroundColor: form.slotDurationMins === opt.value ? ACCENT : 'transparent' }]}
                        onPress={() => setForm(f => ({ ...f, slotDurationMins: opt.value }))}
                      >
                        <Text style={[styles.durationText, { color: form.slotDurationMins === opt.value ? '#fff' : textColor }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Price override */}
              <Text style={[styles.label, { color: mutedColor }]}>PRICE OVERRIDE (optional)</Text>
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor }]}>
                <Text style={[styles.currencySymbol, { color: mutedColor }]}>₹</Text>
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder={`Default: ₹${ground?.pricePerHour}/hr`}
                  placeholderTextColor={isDark ? '#555' : '#bbb'}
                  value={form.priceOverride}
                  onChangeText={v => setForm(f => ({ ...f, priceOverride: v.replace(/[^0-9.]/g, '') }))}
                  keyboardType="decimal-pad"
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSlots} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>
                        {mode === 'single' ? 'Create Slot' : 'Create Slots'}
                      </Text>
                    </>
                  )
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Time pickers */}
      <TimePickerModal
        visible={picker === 'startTime'} title="Start Time"
        value={form.startTime} onSelect={v => setForm(f => ({ ...f, startTime: v }))}
        onClose={() => setPicker(null)} {...{ isDark, cardBg, textColor, mutedColor }}
      />
      <TimePickerModal
        visible={picker === 'endTime'} title="End Time"
        value={form.endTime} onSelect={v => setForm(f => ({ ...f, endTime: v }))}
        onClose={() => setPicker(null)} {...{ isDark, cardBg, textColor, mutedColor }}
      />
      <DatePickerModal
        visible={picker === 'date'} title="Select Date"
        value={form.date} onSelect={v => setForm(f => ({ ...f, date: v }))}
        onClose={() => setPicker(null)} {...{ isDark, cardBg, textColor, mutedColor }}
      />
      <DatePickerModal
        visible={picker === 'fromDate'} title="From Date"
        value={form.fromDate} onSelect={v => setForm(f => ({ ...f, fromDate: v }))}
        onClose={() => setPicker(null)} {...{ isDark, cardBg, textColor, mutedColor }}
      />
      <DatePickerModal
        visible={picker === 'toDate'} title="To Date"
        value={form.toDate} onSelect={v => setForm(f => ({ ...f, toDate: v }))}
        onClose={() => setPicker(null)} {...{ isDark, cardBg, textColor, mutedColor }}
      />
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
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },

  sectionLabel: {
    fontSize: 11, fontFamily: 'Poppins_700Bold', color: ACCENT,
    letterSpacing: 1, marginBottom: 10,
  },
  slotsTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  slotCount: { fontSize: 12, fontFamily: 'Poppins_500Medium' },

  dateChip: {
    width: 60, paddingVertical: 10, borderRadius: 14,
    alignItems: 'center', borderWidth: 1.5,
  },
  dateDayName: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  dateNum: { fontSize: 18, fontFamily: 'Poppins_700Bold', lineHeight: 22 },
  dateMonth: { fontSize: 9, fontFamily: 'Poppins_500Medium', marginTop: 1 },

  slotCard: {
    borderRadius: 8, padding: 12, marginBottom: 10,
    borderLeftWidth: 4, gap: 6,
  },
  slotRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotRow3: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotTime: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  slotSport: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotPrice: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
  bookerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookerName: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  bookerPhone: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontFamily: 'Poppins_700Bold' },
  slotActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },

  emptyBox: {
    borderRadius: 12, padding: 36, alignItems: 'center',
  },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', marginTop: 12 },
  emptyHint: { fontSize: 12, marginTop: 4 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },

  // Add Slots Modal
  addSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold' },

  modeToggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20 },
  modeBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: ACCENT },
  modeBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  label: { fontSize: 10, fontFamily: 'Poppins_700Bold', letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },

  sportsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sportChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  sportChipText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },

  pickerField: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 12, borderWidth: 1.5,
  },
  pickerText: { flex: 1, fontSize: 14, fontFamily: 'Poppins_500Medium' },

  durationRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  durationChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  durationText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12,
  },
  currencySymbol: { fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: 'Poppins_400Regular' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: ACCENT, borderRadius: 14,
    paddingVertical: 14, marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
})
