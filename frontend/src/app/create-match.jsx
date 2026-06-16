import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text as RNText, TextInput as RNTextInput, ScrollView, FlatList,
  StyleSheet, TouchableOpacity, ActivityIndicator, Modal, StatusBar,
  Platform, Alert, KeyboardAvoidingView, Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMyTeams, searchTeams, createMatch } from '../services/api'
import PlayerDropdown from '../components/PlayerDropdown'

const ACCENT = '#C8102E'

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}
function TInput(props) {
  return <RNTextInput {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

const MIN_PLAYERS = 11
const MAX_PLAYERS = 15

// ─── Match format presets ─────────────────────────────────────────────────────

const FORMATS = [
  { key: 'T20',    label: 'T20',    overs: 20,  icon: '⚡', desc: '20 overs' },
  { key: 'ODI',    label: 'ODI',    overs: 50,  icon: '🏏', desc: '50 overs' },
  { key: 'T10',    label: 'T10',    overs: 10,  icon: '🔥', desc: '10 overs' },
  { key: 'TEST',   label: 'Test',   overs: 0,   icon: '🎩', desc: 'Unlimited' },
  { key: 'CUSTOM', label: 'Custom', overs: null, icon: '✏️', desc: 'Set overs' },
]

const BALL_TYPES = [
  { key: 'LEATHER', label: 'Leather', icon: '🟤', desc: 'Hard ball' },
  { key: 'TENNIS',  label: 'Tennis',  icon: '🔴', desc: 'Soft ball' },
  { key: 'OTHER',   label: 'Other',   icon: '⚪', desc: 'Taped / cork' },
]

// ─── Validation ───────────────────────────────────────────────────────────────

function validateMatch(team1, team2) {
  const rules = []
  const t1n = team1.members?.length ?? 0
  const t2n = team2.members?.length ?? 0

  rules.push({ id: 't1_min', label: `${team1.name}: min ${MIN_PLAYERS} players`, pass: t1n >= MIN_PLAYERS, detail: `${t1n} players` })
  rules.push({ id: 't1_max', label: `${team1.name}: max ${MAX_PLAYERS} players`, pass: t1n <= MAX_PLAYERS, detail: `${t1n} players` })
  rules.push({ id: 't2_min', label: `${team2.name}: min ${MIN_PLAYERS} players`, pass: t2n >= MIN_PLAYERS, detail: `${t2n} players` })
  rules.push({ id: 't2_max', label: `${team2.name}: max ${MAX_PLAYERS} players`, pass: t2n <= MAX_PLAYERS, detail: `${t2n} players` })
  const t1Ids = new Set((team1.members || []).map(m => m.userId))
  const dupes = (team2.members || []).filter(m => t1Ids.has(m.userId))
  rules.push({ id: 'no_dupes', label: 'No duplicate players', pass: dupes.length === 0, detail: dupes.length === 0 ? 'All clear' : `${dupes.length} shared` })

  return { rules, allPass: rules.every(r => r.pass) }
}

function RuleRow({ rule }) {
  return (
    <View style={styles.ruleRow}>
      <View style={[styles.ruleIcon, { backgroundColor: rule.pass ? '#22c55e18' : '#ef444418' }]}>
        <Ionicons name={rule.pass ? 'checkmark' : 'close'} size={14} color={rule.pass ? '#22c55e' : '#ef4444'} />
      </View>
      <Text style={[styles.ruleLabel, { color: rule.pass ? '#22c55e' : '#ef4444' }]}>{rule.label}</Text>
      <Text style={[styles.ruleDetail, { color: rule.pass ? '#22c55e' : '#ef4444' }]}>{rule.detail}</Text>
    </View>
  )
}

// ─── Team Slot ────────────────────────────────────────────────────────────────

function TeamSlot({ label, team, onPress, isDark }) {
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#666' : '#bbb'

  if (!team) {
    return (
      <TouchableOpacity style={[styles.teamSlot, styles.teamSlotEmpty, { backgroundColor: cardBg, borderColor: isDark ? '#333' : '#e5e5e5' }]} onPress={onPress} activeOpacity={0.75}>
        <View style={styles.teamSlotEmptyIcon}><Ionicons name="add" size={28} color={ACCENT} /></View>
        <Text style={[styles.teamSlotEmptyLabel, { color: ACCENT }]}>{label}</Text>
        <Text style={[styles.teamSlotEmptySub, { color: mutedColor }]}>Tap to select</Text>
      </TouchableOpacity>
    )
  }
  const initials = team.name.slice(0, 2).toUpperCase()
  return (
    <TouchableOpacity style={[styles.teamSlot, styles.teamSlotFilled, { backgroundColor: cardBg }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.teamSlotAvatar}><Text style={styles.teamSlotAvatarText}>{initials}</Text></View>
      <View style={styles.teamSlotInfo}>
        <Text style={[styles.teamSlotName, { color: textColor }]} numberOfLines={1}>{team.name}</Text>
        <Text style={[styles.teamSlotMeta, { color: ACCENT }]}>{team.sport} · {team.members?.length ?? 0} players</Text>
      </View>
      <Ionicons name="swap-horizontal-outline" size={18} color={ACCENT} />
    </TouchableOpacity>
  )
}

// ─── My Teams Picker ──────────────────────────────────────────────────────────

function MyTeamsModal({ visible, teams, loading, onSelect, onClose, excludeId, isDark }) {
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const bg = isDark ? '#111' : '#f7f7f7'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#888'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={[styles.pickerSheet, { backgroundColor: bg }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <View style={{ width: 32 }} />
            <Text style={[styles.sheetTitle, { color: textColor }]}>Select Your Team</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
              <Ionicons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          {loading
            ? <View style={styles.pickerEmpty}><ActivityIndicator size="large" color={ACCENT} /><Text style={[styles.pickerEmptyText, { color: mutedColor }]}>Loading your teams...</Text></View>
            : teams.length === 0
            ? <View style={styles.pickerEmpty}><Ionicons name="people-outline" size={40} color="#ccc" /><Text style={[styles.pickerEmptyText, { color: mutedColor }]}>No teams yet</Text></View>
            : (
              <FlatList
                data={teams.filter(t => t.id !== excludeId)}
                keyExtractor={t => t.id}
                contentContainerStyle={{ padding: 16, gap: 10 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.pickerItem, { backgroundColor: cardBg }]} onPress={() => onSelect(item)} activeOpacity={0.75}>
                    <View style={styles.pickerItemIcon}><Text style={styles.pickerItemEmoji}>🏏</Text></View>
                    <View style={styles.pickerItemInfo}>
                      <Text style={[styles.pickerItemName, { color: textColor }]}>{item.name}</Text>
                      <Text style={[styles.pickerItemMeta, { color: mutedColor }]}>{item.sport} · {item.members?.length ?? 0}/{item.maxPlayers} players</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={ACCENT} />
                  </TouchableOpacity>
                )}
              />
            )}
        </View>
      </View>
    </Modal>
  )
}

// ─── Team Search Modal ────────────────────────────────────────────────────────

function TeamSearchModal({ visible, onSelect, onClose, excludeId, isDark }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const bg = isDark ? '#111' : '#f7f7f7'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#888'
  const inputBg = isDark ? '#2a2a2a' : '#f0f0f0'

  useEffect(() => { if (!visible) { setQ(''); setResults([]) } }, [visible])

  const doSearch = async (text) => {
    if (text.trim().length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const data = await searchTeams(text.trim())
      setResults((data.teams || []).filter(t => t.id !== excludeId))
    } catch { setResults([]) }
    finally { setSearching(false) }
  }

  const handleChange = (text) => {
    setQ(text)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(text), 400)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={[styles.pickerSheet, { backgroundColor: bg }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <View style={{ width: 32 }} />
            <Text style={[styles.sheetTitle, { color: textColor }]}>Find Opponent Team</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
              <Ionicons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={[styles.searchInput, { backgroundColor: inputBg }]}>
            <Ionicons name="search" size={17} color="#888" />
            <TInput style={[styles.searchInputText, { color: textColor }]} placeholder="Search team name..." placeholderTextColor={mutedColor} value={q} onChangeText={handleChange} autoFocus />
            {searching && <ActivityIndicator size="small" color={ACCENT} />}
          </View>
          {results.length === 0 && q.length >= 2 && !searching && (
            <View style={styles.pickerEmpty}><Ionicons name="sad-outline" size={36} color="#ccc" /><Text style={[styles.pickerEmptyText, { color: mutedColor }]}>No teams found</Text></View>
          )}
          {q.length < 2 && (
            <View style={styles.pickerEmpty}><Ionicons name="people-outline" size={36} color="#ccc" /><Text style={[styles.pickerEmptyText, { color: mutedColor }]}>Type a team name to search</Text></View>
          )}
          <FlatList
            data={results}
            keyExtractor={t => t.id}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.pickerItem, { backgroundColor: cardBg }]} onPress={() => onSelect(item)} activeOpacity={0.75}>
                <View style={styles.pickerItemIcon}><Text style={styles.pickerItemEmoji}>🏏</Text></View>
                <View style={styles.pickerItemInfo}>
                  <Text style={[styles.pickerItemName, { color: textColor }]}>{item.name}</Text>
                  <Text style={[styles.pickerItemMeta, { color: mutedColor }]}>{item.sport} · {item.members?.length ?? 0}/{item.maxPlayers}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={ACCENT} />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  )
}

// ─── Match Setup Modal (5 steps) ──────────────────────────────────────────────

function MatchSetupModal({ visible, team1, team2, onClose, onStartMatch, isDark }) {
  const [step, setStep] = useState(1)
  // Step 1
  const [selectedFormat, setSelectedFormat] = useState(null)
  const [customOvers, setCustomOvers] = useState('')
  // Step 2
  const [ballType, setBallType] = useState(null)
  const [powerplayOvers, setPowerplayOvers] = useState('6')
  const [powerplayAuto, setPowerplayAuto] = useState(true)
  // Step 3
  const [tossWonByTeamId, setTossWonByTeamId] = useState(null)
  // Step 4
  const [tossChoice, setTossChoice] = useState(null)
  // Step 5: opening lineup — striker, non-striker, opening bowler (column-wise dropdowns)
  const [selectedBatsmen, setSelectedBatsmen] = useState([null, null])
  const [selectedBowler, setSelectedBowler] = useState(null)
  const [creating, setCreating] = useState(false)
  const insets = useSafeAreaInsets()

  const lineupReady = !!(selectedBatsmen[0] && selectedBatsmen[1] && selectedBowler)

  const startFooterAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(startFooterAnim, {
      toValue: lineupReady ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start()
  }, [lineupReady])

  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'
  const subBg = isDark ? '#2a2a2a' : '#f0f0f0'

  const isTest = selectedFormat?.key === 'TEST'
  const finalOvers = isTest ? 0 : (selectedFormat?.key === 'CUSTOM' ? parseInt(customOvers) || 0 : selectedFormat?.overs || 0)
  const oversReady = isTest || (finalOvers >= 1 && finalOvers <= 150)

  const battingFirstTeamId = tossWonByTeamId && tossChoice
    ? (tossWonByTeamId === team1?.id
      ? (tossChoice === 'BAT' ? team1?.id : team2?.id)
      : (tossChoice === 'BAT' ? team2?.id : team1?.id))
    : null

  const battingTeam = battingFirstTeamId === team1?.id ? team1 : team2
  const bowlingTeam = battingFirstTeamId === team1?.id ? team2 : team1
  const tossWinner = tossWonByTeamId === team1?.id ? team1 : team2

  useEffect(() => {
    if (visible) {
      setStep(1); setSelectedFormat(null); setCustomOvers(''); setBallType(null)
      setPowerplayOvers('6'); setPowerplayAuto(true)
      setTossWonByTeamId(null); setTossChoice(null)
      setSelectedBatsmen([null, null]); setSelectedBowler(null)
    }
  }, [visible])

  const handleCreate = async () => {
    if (creating) return
    setCreating(true)
    try {
      const t1Ids = (team1.members || []).map(m => m.userId)
      const t2Ids = (team2.members || []).map(m => m.userId)
      const data = await createMatch({
        team1Id: team1.id,
        team2Id: team2.id,
        totalOvers: finalOvers,
        matchFormat: selectedFormat?.key || 'CUSTOM',
        ballType: ballType || 'LEATHER',
        powerplayOvers: powerplayAuto ? 6 : (parseInt(powerplayOvers) || 6),
        isTest,
        tossWonByTeamId,
        tossChoice,
        openingBatsman1Id: selectedBatsmen[0] || null,
        openingBatsman2Id: selectedBatsmen[1] || null,
        openingBowlerId: selectedBowler || null,
        team1PlayerIds: t1Ids,
        team2PlayerIds: t2Ids,
      })
      onStartMatch(data.match)
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create match')
    } finally {
      setCreating(false)
    }
  }

  if (!team1 || !team2) return null

  const TOTAL_STEPS = 5
  const stepLabel = ['Match Format', 'Ball & Powerplay', 'Toss', 'Bat or Bowl', 'Opening Lineup'][step - 1]

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.setupOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={[styles.setupSheet, { backgroundColor: bg }]}>
            {/* Header */}
            <LinearGradient colors={[ACCENT, '#a00d24']} style={styles.setupHeader}>
              <TouchableOpacity onPress={onClose} style={styles.setupBackBtn}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.setupHeaderTitle}>Match Setup</Text>
                <Text style={styles.setupHeaderSub}>{stepLabel}</Text>
              </View>
              <View style={{ width: 36 }} />
            </LinearGradient>

            {/* Step dots */}
            <View style={styles.stepBar}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <View key={i} style={[styles.stepDot, i < step ? styles.stepDotActive : { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
              ))}
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >

              {/* ── STEP 1: Match Format ── */}
              {step === 1 && (
                <View style={styles.stepContent}>
                  <Text style={styles.setupEmoji}>🏏</Text>
                  <Text style={[styles.setupTitle, { color: textColor }]}>Match Format</Text>

                  <View style={styles.formatGrid}>
                    {FORMATS.map(f => {
                      const active = selectedFormat?.key === f.key
                      return (
                        <TouchableOpacity key={f.key} style={[styles.formatCard, { backgroundColor: cardBg }, active && styles.formatCardActive]} onPress={() => setSelectedFormat(f)} activeOpacity={0.8}>
                          <Text style={styles.formatIcon}>{f.icon}</Text>
                          <Text style={[styles.formatLabel, active && { color: '#fff' }]}>{f.label}</Text>
                          <Text style={[styles.formatDesc, active && { color: 'rgba(255,255,255,0.7)' }]}>{f.desc}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  {selectedFormat?.key === 'CUSTOM' && (
                    <View style={[styles.customInput, { backgroundColor: cardBg }]}>
                      <Ionicons name="create-outline" size={20} color={ACCENT} />
                      <TInput
                        style={[styles.customInputText, { color: textColor }]}
                        placeholder="Number of overs (1–150)"
                        placeholderTextColor={mutedColor}
                        keyboardType="number-pad"
                        value={customOvers}
                        onChangeText={setCustomOvers}
                        maxLength={3}
                      />
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.nextBtn, (!selectedFormat || !oversReady) && styles.nextBtnDisabled]}
                    onPress={() => selectedFormat && oversReady && setStep(2)}
                    disabled={!selectedFormat || !oversReady}
                  >
                    <Text style={styles.nextBtnText}>Next</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              {/* ── STEP 2: Ball Type & Powerplay ── */}
              {step === 2 && (
                <View style={styles.stepContent}>
                  <Text style={styles.setupEmoji}>🎯</Text>
                  <Text style={[styles.setupTitle, { color: textColor }]}>Ball & Powerplay</Text>

                  <Text style={[styles.sectionLbl, { color: mutedColor }]}>BALL TYPE</Text>
                  <View style={styles.ballRow}>
                    {BALL_TYPES.map(b => {
                      const active = ballType === b.key
                      return (
                        <TouchableOpacity key={b.key} style={[styles.ballCard, { backgroundColor: cardBg }, active && styles.ballCardActive]} onPress={() => setBallType(b.key)} activeOpacity={0.8}>
                          <Text style={styles.ballIcon}>{b.icon}</Text>
                          <Text style={[styles.ballLabel, active && { color: '#fff' }]}>{b.label}</Text>
                          <Text style={[styles.ballDesc, active && { color: 'rgba(255,255,255,0.7)' }]}>{b.desc}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  {!isTest && (
                    <>
                      <Text style={[styles.sectionLbl, { color: mutedColor }]}>POWERPLAY</Text>
                      <View style={styles.toggleRow}>
                        <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: cardBg }, powerplayAuto && styles.toggleBtnActive]} onPress={() => setPowerplayAuto(true)} activeOpacity={0.8}>
                          <Ionicons name="flash" size={16} color={powerplayAuto ? '#fff' : ACCENT} />
                          <Text style={[styles.toggleBtnText, powerplayAuto && { color: '#fff' }]}>Auto (first 6)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: cardBg }, !powerplayAuto && styles.toggleBtnActive]} onPress={() => setPowerplayAuto(false)} activeOpacity={0.8}>
                          <Ionicons name="create-outline" size={16} color={!powerplayAuto ? '#fff' : ACCENT} />
                          <Text style={[styles.toggleBtnText, !powerplayAuto && { color: '#fff' }]}>Manual</Text>
                        </TouchableOpacity>
                      </View>

                      {!powerplayAuto && (
                        <View style={[styles.customInput, { backgroundColor: cardBg }]}>
                          <Ionicons name="timer-outline" size={20} color={ACCENT} />
                          <TInput
                            style={[styles.customInputText, { color: textColor }]}
                            placeholder="Powerplay overs (e.g. 6)"
                            placeholderTextColor={mutedColor}
                            keyboardType="number-pad"
                            value={powerplayOvers}
                            onChangeText={setPowerplayOvers}
                            maxLength={2}
                          />
                        </View>
                      )}
                    </>
                  )}

                  <View style={styles.stepNavRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                      <Ionicons name="arrow-back" size={18} color={ACCENT} />
                      <Text style={[styles.backBtnText, { color: ACCENT }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.nextBtn, { flex: 1 }, !ballType && styles.nextBtnDisabled]}
                      onPress={() => ballType && setStep(3)}
                      disabled={!ballType}
                    >
                      <Text style={styles.nextBtnText}>Next</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── STEP 3: Toss ── */}
              {step === 3 && (
                <View style={styles.stepContent}>
                  <Text style={styles.setupEmoji}>🪙</Text>
                  <Text style={[styles.setupTitle, { color: textColor }]}>Who won the toss?</Text>

                  <View style={styles.tossRow}>
                    {[team1, team2].map(team => {
                      const active = tossWonByTeamId === team.id
                      return (
                        <TouchableOpacity key={team.id} style={[styles.tossCard, { backgroundColor: cardBg }, active && styles.tossCardActive]} onPress={() => setTossWonByTeamId(team.id)} activeOpacity={0.8}>
                          <View style={[styles.tossAvatar, active && { backgroundColor: '#fff' }]}>
                            <Text style={[styles.tossAvatarText, active && { color: ACCENT }]}>{team.name.slice(0, 2).toUpperCase()}</Text>
                          </View>
                          <Text style={[styles.tossTeamName, { color: active ? '#fff' : textColor }]} numberOfLines={2}>{team.name}</Text>
                          {active && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  <View style={styles.stepNavRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                      <Ionicons name="arrow-back" size={18} color={ACCENT} />
                      <Text style={[styles.backBtnText, { color: ACCENT }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.nextBtn, { flex: 1 }, !tossWonByTeamId && styles.nextBtnDisabled]}
                      onPress={() => tossWonByTeamId && setStep(4)}
                      disabled={!tossWonByTeamId}
                    >
                      <Text style={styles.nextBtnText}>Next</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── STEP 4: Bat or Bowl ── */}
              {step === 4 && tossWinner && (
                <View style={styles.stepContent}>
                  <Text style={styles.setupEmoji}>⚡</Text>
                  <Text style={[styles.setupTitle, { color: textColor }]}>{tossWinner.name}</Text>
                  <Text style={[styles.setupSub, { color: mutedColor }]}>elected to…</Text>

                  <View style={styles.batBowlRow}>
                    {[
                      { key: 'BAT', label: 'BAT', icon: '🏏', desc: 'Bat first' },
                      { key: 'BOWL', label: 'BOWL', icon: '⚾', desc: 'Bowl first' },
                    ].map(opt => {
                      const active = tossChoice === opt.key
                      return (
                        <TouchableOpacity key={opt.key} style={[styles.batBowlCard, { backgroundColor: cardBg }, active && styles.batBowlCardActive]} onPress={() => setTossChoice(opt.key)} activeOpacity={0.8}>
                          <Text style={styles.batBowlIcon}>{opt.icon}</Text>
                          <Text style={[styles.batBowlLabel, active && { color: '#fff' }]}>{opt.label}</Text>
                          <Text style={[styles.batBowlDesc, active && { color: 'rgba(255,255,255,0.7)' }]}>{opt.desc}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  <View style={styles.stepNavRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => setStep(3)}>
                      <Ionicons name="arrow-back" size={18} color={ACCENT} />
                      <Text style={[styles.backBtnText, { color: ACCENT }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.nextBtn, { flex: 1 }, !tossChoice && styles.nextBtnDisabled]}
                      onPress={() => tossChoice && setStep(5)}
                      disabled={!tossChoice}
                    >
                      <Text style={styles.nextBtnText}>Next</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── STEP 5: Opening Lineup — Striker, Non-Striker, Bowler (column-wise dropdowns) ── */}
              {step === 5 && battingTeam && bowlingTeam && (
                <View style={styles.stepContent}>
                  <Text style={styles.setupEmoji}>🏏</Text>
                  <Text style={[styles.setupTitle, { color: textColor }]}>Opening Lineup</Text>
                  <Text style={[styles.setupSub, { color: mutedColor }]}>{battingTeam.name} batting · {bowlingTeam.name} bowling</Text>

                  <View style={{ gap: 10 }}>
                    <PlayerDropdown
                      label="Striker" icon="🏏"
                      players={battingTeam.members || []}
                      value={selectedBatsmen[0]}
                      onChange={id => setSelectedBatsmen([id, selectedBatsmen[1]])}
                      excludeIds={[selectedBatsmen[1]].filter(Boolean)}
                      accentColor={ACCENT}
                      isDark={isDark}
                    />
                    <PlayerDropdown
                      label="Non-Striker" icon="🏃"
                      players={battingTeam.members || []}
                      value={selectedBatsmen[1]}
                      onChange={id => setSelectedBatsmen([selectedBatsmen[0], id])}
                      excludeIds={[selectedBatsmen[0]].filter(Boolean)}
                      disabled={!selectedBatsmen[0]}
                      accentColor="#f59e0b"
                      isDark={isDark}
                    />
                    <PlayerDropdown
                      label="Opening Bowler" icon="⚾"
                      players={bowlingTeam.members || []}
                      value={selectedBowler}
                      onChange={setSelectedBowler}
                      disabled={!selectedBatsmen[0] || !selectedBatsmen[1]}
                      accentColor="#1d4ed8"
                      isDark={isDark}
                    />
                  </View>

                  {/* Summary before starting */}
                  {lineupReady && (
                    <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
                      <View style={styles.summaryRow}>
                        <Ionicons name="shield-checkmark" size={16} color={GREEN} />
                        <Text style={[styles.summaryText, { color: textColor }]}>
                          {selectedFormat?.label} · {isTest ? 'Test' : `${finalOvers} overs`} · {BALL_TYPES.find(b => b.key === ballType)?.label || ''} ball
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Ionicons name="trophy" size={16} color="#f59e0b" />
                        <Text style={[styles.summaryText, { color: textColor }]}>
                          Toss: {tossWinner?.name} chose to {tossChoice?.toLowerCase()}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Ionicons name="person" size={16} color="#3b82f6" />
                        <Text style={[styles.summaryText, { color: textColor }]}>
                          {battingTeam?.name} batting first
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.stepNavRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedBatsmen([null, null]); setSelectedBowler(null); setStep(4) }}>
                      <Ionicons name="arrow-back" size={18} color={ACCENT} />
                      <Text style={[styles.backBtnText, { color: ACCENT }]}>Back</Text>
                    </TouchableOpacity>
                  </View>

                  {lineupReady && <View style={{ height: 84 + insets.bottom }} />}
                </View>
              )}

            </ScrollView>

            {/* Sliding "Start Match" footer — appears once striker, non-striker & bowler are all set */}
            {step === 5 && (
              <Animated.View
                style={[
                  styles.startFooter,
                  {
                    backgroundColor: bg,
                    borderTopColor: isDark ? '#2a2a2a' : '#eee',
                    paddingBottom: 12 + insets.bottom,
                    transform: [{
                      translateY: startFooterAnim.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }),
                    }],
                    opacity: startFooterAnim,
                  },
                ]}
                pointerEvents={lineupReady ? 'auto' : 'none'}
              >
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: GREEN }, creating && styles.nextBtnDisabled]}
                  onPress={handleCreate}
                  disabled={!lineupReady || creating}
                >
                  {creating
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                      <Ionicons name="play-circle" size={20} color="#fff" />
                      <Text style={styles.nextBtnText}>Start Match!</Text>
                    </>
                  }
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreateMatchScreen() {
  const router = useRouter()
  const theme = useSelector(s => s.user.theme)
  const isDark = theme === 'dark'
  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'

  const [myTeams, setMyTeams] = useState([])
  const [team1, setTeam1] = useState(null)
  const [team2, setTeam2] = useState(null)
  const [showT1Modal, setShowT1Modal] = useState(false)
  const [showT2Modal, setShowT2Modal] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [validation, setValidation] = useState(null)
  const [loadingTeams, setLoadingTeams] = useState(true)

  useEffect(() => {
    getMyTeams().then(d => setMyTeams(d.teams || [])).catch(() => {}).finally(() => setLoadingTeams(false))
  }, [])

  useEffect(() => {
    if (team1 && team2) setValidation(validateMatch(team1, team2))
    else setValidation(null)
  }, [team1, team2])

  const topPad = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 8

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar backgroundColor={ACCENT} barStyle="light-content" />
      <LinearGradient colors={[ACCENT, '#a00d24']} style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Match</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.sportBadgeRow}>
          <View style={[styles.sportBadge, { backgroundColor: cardBg }]}>
            <Text style={styles.sportBadgeEmoji}>🏏</Text>
            <Text style={[styles.sportBadgeText, { color: textColor }]}>Cricket</Text>
          </View>
        </View>

        <Text style={[styles.sectionLbl, { color: mutedColor }]}>TEAM 1 — YOUR TEAM</Text>
        <TeamSlot label="Select Your Team" team={team1} onPress={() => setShowT1Modal(true)} isDark={isDark} />

        <View style={styles.vsDivider}>
          <View style={[styles.vsDividerLine, { backgroundColor: isDark ? '#2a2a2a' : '#e5e5e5' }]} />
          <View style={styles.vsBadge}><Text style={styles.vsBadgeText}>VS</Text></View>
          <View style={[styles.vsDividerLine, { backgroundColor: isDark ? '#2a2a2a' : '#e5e5e5' }]} />
        </View>

        <Text style={[styles.sectionLbl, { color: mutedColor }]}>TEAM 2 — OPPONENT</Text>
        <TeamSlot label="Find Opponent Team" team={team2} onPress={() => setShowT2Modal(true)} isDark={isDark} />

        {validation && (
          <View style={[styles.rulesCard, { backgroundColor: cardBg }]}>
            <View style={styles.rulesHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color={validation.allPass ? '#22c55e' : '#f59e0b'} />
              <Text style={[styles.rulesTitle, { color: textColor }]}>Match Rules Check</Text>
              {validation.allPass && <View style={styles.allPassBadge}><Text style={styles.allPassText}>All Good</Text></View>}
            </View>
            <View style={{ gap: 8 }}>{validation.rules.map(r => <RuleRow key={r.id} rule={r} />)}</View>
          </View>
        )}

        {team1 && team2 && (
          <TouchableOpacity
            style={[styles.startBtn, !validation?.allPass && styles.startBtnDisabled]}
            onPress={() => validation?.allPass && setShowSetup(true)}
            disabled={!validation?.allPass}
            activeOpacity={0.85}
          >
            <Ionicons name="settings-outline" size={22} color="#fff" />
            <Text style={styles.startBtnText}>{validation?.allPass ? 'Setup Match' : 'Fix issues above'}</Text>
          </TouchableOpacity>
        )}

        {!team1 && !team2 && !loadingTeams && myTeams.length === 0 && (
          <View style={[styles.noTeamsBox, { backgroundColor: cardBg }]}>
            <Ionicons name="people-outline" size={36} color="#ccc" />
            <Text style={[styles.noTeamsText, { color: mutedColor }]}>You have no teams yet.</Text>
            <TouchableOpacity onPress={() => router.push('/create-team')}>
              <Text style={styles.noTeamsLink}>Create a team first →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <MyTeamsModal visible={showT1Modal} teams={myTeams} loading={loadingTeams} onSelect={t => { setTeam1(t); setShowT1Modal(false) }} onClose={() => setShowT1Modal(false)} excludeId={team2?.id} isDark={isDark} />
      <TeamSearchModal visible={showT2Modal} onSelect={t => { setTeam2(t); setShowT2Modal(false) }} onClose={() => setShowT2Modal(false)} excludeId={team1?.id} isDark={isDark} />
      <MatchSetupModal visible={showSetup} team1={team1} team2={team2} onClose={() => setShowSetup(false)} onStartMatch={(m) => { setShowSetup(false); router.push(`/match-scoring/${m.id}`) }} isDark={isDark} />
    </View>
  )
}

const GREEN = '#22c55e'

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold' },
  scroll: { padding: 16, paddingBottom: 48, gap: 14 },

  sportBadgeRow: { alignItems: 'center' },
  sportBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, elevation: 2 },
  sportBadgeEmoji: { fontSize: 20 },
  sportBadgeText: { fontSize: 14, fontFamily: 'Poppins_700Bold' },

  sectionLbl: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1.2, marginBottom: -6 },

  teamSlot: { borderRadius: 16, elevation: 3 },
  teamSlotEmpty: { borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', paddingVertical: 24, gap: 6 },
  teamSlotEmptyIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: ACCENT + '15', justifyContent: 'center', alignItems: 'center' },
  teamSlotEmptyLabel: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  teamSlotEmptySub: { fontSize: 12 },
  teamSlotFilled: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  teamSlotAvatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  teamSlotAvatarText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_800ExtraBold' },
  teamSlotInfo: { flex: 1 },
  teamSlotName: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  teamSlotMeta: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', marginTop: 3 },

  vsDivider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vsDividerLine: { flex: 1, height: 1 },
  vsBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  vsBadgeText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_800ExtraBold' },

  rulesCard: { borderRadius: 16, padding: 16, elevation: 3, gap: 12 },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rulesTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold', flex: 1 },
  allPassBadge: { backgroundColor: '#22c55e18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  allPassText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: '#22c55e' },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleIcon: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  ruleLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', flex: 1 },
  ruleDetail: { fontSize: 12 },

  startBtn: { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  startBtnDisabled: { backgroundColor: '#ccc' },
  startBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },

  noTeamsBox: { borderRadius: 14, padding: 28, alignItems: 'center', gap: 8 },
  noTeamsText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  noTeamsLink: { color: ACCENT, fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  // Sheet pickers
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', textAlign: 'center', flex: 1 },
  sheetCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  pickerEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  pickerEmptyText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, gap: 12, elevation: 2 },
  pickerItemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: ACCENT + '15', justifyContent: 'center', alignItems: 'center' },
  pickerItemEmoji: { fontSize: 22 },
  pickerItemInfo: { flex: 1 },
  pickerItemName: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  pickerItemMeta: { fontSize: 12, marginTop: 2 },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInputText: { flex: 1, fontSize: 14 },

  // Setup modal
  setupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  setupSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '94%', overflow: 'hidden' },
  setupHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  setupBackBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  setupHeaderTitle: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  setupHeaderSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Poppins_400Regular' },

  stepBar: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 12 },
  stepDot: { width: 28, height: 4, borderRadius: 2 },
  stepDotActive: { backgroundColor: ACCENT },

  stepContent: { gap: 14 },
  setupEmoji: { fontSize: 40, textAlign: 'center' },
  setupTitle: { fontSize: 22, fontFamily: 'Poppins_800ExtraBold', textAlign: 'center' },
  setupSub: { fontSize: 13, textAlign: 'center', marginTop: -10 },

  // Format grid
  formatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  formatCard: { width: '30%', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, elevation: 2 },
  formatCardActive: { backgroundColor: ACCENT },
  formatIcon: { fontSize: 24 },
  formatLabel: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: ACCENT },
  formatDesc: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: '#888' },

  // Custom overs input
  customInput: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  customInputText: { flex: 1, fontSize: 15, fontFamily: 'Poppins_600SemiBold' },

  // Ball
  ballRow: { flexDirection: 'row', gap: 10 },
  ballCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, elevation: 2 },
  ballCardActive: { backgroundColor: ACCENT },
  ballIcon: { fontSize: 24 },
  ballLabel: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: ACCENT },
  ballDesc: { fontSize: 11, color: '#888' },

  // Powerplay toggle
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 12, elevation: 2 },
  toggleBtnActive: { backgroundColor: ACCENT },
  toggleBtnText: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: ACCENT },

  // Toss
  tossRow: { flexDirection: 'row', gap: 12 },
  tossCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, elevation: 2 },
  tossCardActive: { backgroundColor: ACCENT },
  tossAvatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: ACCENT + '20', justifyContent: 'center', alignItems: 'center' },
  tossAvatarText: { fontSize: 18, fontFamily: 'Poppins_800ExtraBold', color: ACCENT },
  tossTeamName: { fontSize: 13, fontFamily: 'Poppins_700Bold', textAlign: 'center' },

  // Bat/Bowl
  batBowlRow: { flexDirection: 'row', gap: 12 },
  batBowlCard: { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center', gap: 6, elevation: 2 },
  batBowlCardActive: { backgroundColor: ACCENT },
  batBowlIcon: { fontSize: 36 },
  batBowlLabel: { fontSize: 20, fontFamily: 'Poppins_800ExtraBold', color: ACCENT },
  batBowlDesc: { fontSize: 12, color: '#888' },

  // Summary
  summaryCard: { borderRadius: 12, padding: 14, gap: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  // Nav
  stepNavRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  startFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16, borderTopWidth: 1 },
  nextBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnDisabled: { backgroundColor: '#ccc' },
  nextBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 14 },
  backBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
})
