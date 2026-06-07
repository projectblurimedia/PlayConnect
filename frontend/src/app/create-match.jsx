import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text as RNText, TextInput, ScrollView, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Modal, StatusBar, Platform, Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { getMyTeams, searchTeams } from '../services/api'

const ACCENT = '#C8102E'
const poppins = { fontFamily: 'Poppins_400Regular' }
function Text(props) {
  return <RNText {...props} style={[poppins, props.style]} />
}

const MIN_PLAYERS = 11
const MAX_PLAYERS = 15

// ─── Validation ──────────────────────────────────────────────────────────────

function validateMatch(team1, team2) {
  const rules = []
  const t1n = team1.members?.length ?? 0
  const t2n = team2.members?.length ?? 0

  rules.push({
    id: 't1_min', label: `${team1.name}: min ${MIN_PLAYERS} players`,
    pass: t1n >= MIN_PLAYERS,
    detail: `${t1n} player${t1n !== 1 ? 's' : ''}`,
  })
  rules.push({
    id: 't1_max', label: `${team1.name}: max ${MAX_PLAYERS} players`,
    pass: t1n <= MAX_PLAYERS,
    detail: `${t1n} player${t1n !== 1 ? 's' : ''}`,
  })
  rules.push({
    id: 't2_min', label: `${team2.name}: min ${MIN_PLAYERS} players`,
    pass: t2n >= MIN_PLAYERS,
    detail: `${t2n} player${t2n !== 1 ? 's' : ''}`,
  })
  rules.push({
    id: 't2_max', label: `${team2.name}: max ${MAX_PLAYERS} players`,
    pass: t2n <= MAX_PLAYERS,
    detail: `${t2n} player${t2n !== 1 ? 's' : ''}`,
  })

  const t1Ids = new Set((team1.members || []).map(m => m.userId))
  const dupes  = (team2.members || []).filter(m => t1Ids.has(m.userId))
  rules.push({
    id: 'no_dupes', label: 'No duplicate players',
    pass: dupes.length === 0,
    detail: dupes.length === 0 ? 'All clear' : `${dupes.length} player${dupes.length > 1 ? 's' : ''} in both teams`,
  })

  return { rules, allPass: rules.every(r => r.pass) }
}

// ─── Rule Row ────────────────────────────────────────────────────────────────

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

// ─── Team Card (selector) ────────────────────────────────────────────────────

function TeamSlot({ label, team, onPress, isDark }) {
  const cardBg    = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor= isDark ? '#666' : '#bbb'

  if (!team) {
    return (
      <TouchableOpacity style={[styles.teamSlot, styles.teamSlotEmpty, { backgroundColor: cardBg, borderColor: isDark ? '#333' : '#e5e5e5' }]} onPress={onPress} activeOpacity={0.75}>
        <View style={styles.teamSlotEmptyIcon}>
          <Ionicons name="add" size={28} color={ACCENT} />
        </View>
        <Text style={[styles.teamSlotEmptyLabel, { color: ACCENT }]}>{label}</Text>
        <Text style={[styles.teamSlotEmptySub, { color: mutedColor }]}>Tap to select</Text>
      </TouchableOpacity>
    )
  }

  const memberCount = team.members?.length ?? 0
  const initials = team.name.slice(0, 2).toUpperCase()

  return (
    <TouchableOpacity style={[styles.teamSlot, styles.teamSlotFilled, { backgroundColor: cardBg }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.teamSlotAvatar}>
        <Text style={[styles.teamSlotAvatarText]}>{initials}</Text>
      </View>
      <View style={styles.teamSlotInfo}>
        <Text style={[styles.teamSlotName, { color: textColor }]} numberOfLines={1}>{team.name}</Text>
        <Text style={[styles.teamSlotMeta, { color: ACCENT }]}>
          {team.sport} · {memberCount} players
        </Text>
      </View>
      <Ionicons name="swap-horizontal-outline" size={18} color={ACCENT} />
    </TouchableOpacity>
  )
}

// ─── My Teams Picker Modal ────────────────────────────────────────────────────

function MyTeamsModal({ visible, teams, onSelect, onClose, excludeId, isDark }) {
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const bg     = isDark ? '#111' : '#f7f7f7'
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

          {teams.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Ionicons name="people-outline" size={40} color="#ccc" />
              <Text style={[styles.pickerEmptyText, { color: mutedColor }]}>No teams yet</Text>
            </View>
          ) : (
            <FlatList
              data={teams.filter(t => t.id !== excludeId)}
              keyExtractor={t => t.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.pickerItem, { backgroundColor: cardBg }]} onPress={() => onSelect(item)} activeOpacity={0.75}>
                  <View style={styles.pickerItemIcon}>
                    <Text style={styles.pickerItemEmoji}>🏏</Text>
                  </View>
                  <View style={styles.pickerItemInfo}>
                    <Text style={[styles.pickerItemName, { color: textColor }]}>{item.name}</Text>
                    <Text style={[styles.pickerItemMeta, { color: mutedColor }]}>
                      {item.sport} · {item.members?.length ?? 0}/{item.maxPlayers} players
                    </Text>
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
  const [q, setQ]             = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  const cardBg    = isDark ? '#1e1e1e' : '#fff'
  const bg        = isDark ? '#111' : '#f7f7f7'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#888'
  const inputBg   = isDark ? '#2a2a2a' : '#f0f0f0'

  useEffect(() => {
    if (!visible) { setQ(''); setResults([]) }
  }, [visible])

  const doSearch = async (text) => {
    if (text.trim().length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const data = await searchTeams(text.trim())
      setResults((data.teams || []).filter(t => t.id !== excludeId))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
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

          {/* Search input */}
          <View style={[styles.searchInput, { backgroundColor: inputBg }]}>
            <Ionicons name="search" size={17} color="#888" />
            <TextInput
              style={[styles.searchInputText, { color: textColor }]}
              placeholder="Search team name..."
              placeholderTextColor={mutedColor}
              value={q}
              onChangeText={handleChange}
              autoFocus
            />
            {searching && <ActivityIndicator size="small" color={ACCENT} />}
          </View>

          {results.length === 0 && q.length >= 2 && !searching && (
            <View style={styles.pickerEmpty}>
              <Ionicons name="sad-outline" size={36} color="#ccc" />
              <Text style={[styles.pickerEmptyText, { color: mutedColor }]}>No teams found</Text>
            </View>
          )}
          {q.length < 2 && (
            <View style={styles.pickerEmpty}>
              <Ionicons name="people-outline" size={36} color="#ccc" />
              <Text style={[styles.pickerEmptyText, { color: mutedColor }]}>Type a team name to search</Text>
            </View>
          )}

          <FlatList
            data={results}
            keyExtractor={t => t.id}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.pickerItem, { backgroundColor: cardBg }]} onPress={() => onSelect(item)} activeOpacity={0.75}>
                <View style={styles.pickerItemIcon}>
                  <Text style={styles.pickerItemEmoji}>🏏</Text>
                </View>
                <View style={styles.pickerItemInfo}>
                  <Text style={[styles.pickerItemName, { color: textColor }]}>{item.name}</Text>
                  <Text style={[styles.pickerItemMeta, { color: mutedColor }]}>
                    {item.sport} · {item.members?.length ?? 0}/{item.maxPlayers} players
                  </Text>
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

// ─── Ready Popup ─────────────────────────────────────────────────────────────

function ReadyPopup({ visible, team1, team2, onClose }) {
  const scale = useRef(new Animated.Value(0.7)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start()
    } else {
      scale.setValue(0.7)
      opacity.setValue(0)
    }
  }, [visible])

  if (!team1 || !team2) return null

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.popupOverlay}>
        <Animated.View style={[styles.popupCard, { opacity, transform: [{ scale }] }]}>
          {/* top confetti strip */}
          <LinearGradient colors={[ACCENT, '#ff6b35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.popupBanner}>
            <Text style={styles.popupBannerText}>🏏  CRICKET MATCH  🏏</Text>
          </LinearGradient>

          <View style={styles.popupBody}>
            <Text style={styles.popupEmoji}>🏆</Text>
            <Text style={styles.popupTitle}>Ready for the Game!</Text>

            {/* VS badge */}
            <View style={styles.popupVsRow}>
              <View style={styles.popupTeamBox}>
                <Text style={styles.popupTeamInitials}>{team1.name.slice(0, 2).toUpperCase()}</Text>
                <Text style={styles.popupTeamName} numberOfLines={2}>{team1.name}</Text>
                <Text style={styles.popupTeamCount}>{team1.members?.length} players</Text>
              </View>
              <View style={styles.popupVsBadge}>
                <Text style={styles.popupVsText}>VS</Text>
              </View>
              <View style={styles.popupTeamBox}>
                <Text style={styles.popupTeamInitials}>{team2.name.slice(0, 2).toUpperCase()}</Text>
                <Text style={styles.popupTeamName} numberOfLines={2}>{team2.name}</Text>
                <Text style={styles.popupTeamCount}>{team2.members?.length} players</Text>
              </View>
            </View>

            {/* coming soon */}
            <View style={styles.comingSoonBox}>
              <Ionicons name="time-outline" size={18} color="#f59e0b" />
              <Text style={styles.comingSoonText}>Full match scheduling coming soon</Text>
            </View>
            <Text style={styles.comingSoonSub}>
              Match fixtures, toss, scorecard & live updates are on their way.
              Stay tuned!
            </Text>

            <TouchableOpacity style={styles.popupOkBtn} onPress={onClose}>
              <Text style={styles.popupOkText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CreateMatchScreen() {
  const router   = useRouter()
  const theme    = useSelector(s => s.user.theme)
  const isDark   = theme === 'dark'
  const bg       = isDark ? '#111' : '#f8f9fa'
  const cardBg   = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'

  const [myTeams, setMyTeams]           = useState([])
  const [team1, setTeam1]               = useState(null)
  const [team2, setTeam2]               = useState(null)
  const [showT1Modal, setShowT1Modal]   = useState(false)
  const [showT2Modal, setShowT2Modal]   = useState(false)
  const [showReady, setShowReady]       = useState(false)
  const [validation, setValidation]     = useState(null)
  const [loadingTeams, setLoadingTeams] = useState(true)

  useEffect(() => {
    getMyTeams()
      .then(d => setMyTeams(d.teams || []))
      .catch(() => {})
      .finally(() => setLoadingTeams(false))
  }, [])

  // Re-run validation whenever either team changes
  useEffect(() => {
    if (team1 && team2) setValidation(validateMatch(team1, team2))
    else setValidation(null)
  }, [team1, team2])

  const selectTeam1 = (t) => { setTeam1(t); setShowT1Modal(false) }
  const selectTeam2 = (t) => { setTeam2(t); setShowT2Modal(false) }

  const handleStart = () => {
    if (validation?.allPass) setShowReady(true)
  }

  const topPad = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 8

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar backgroundColor={ACCENT} barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[ACCENT, '#a00d24']} style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Match</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Sport badge */}
        <View style={styles.sportBadgeRow}>
          <View style={[styles.sportBadge, { backgroundColor: cardBg }]}>
            <Text style={styles.sportBadgeEmoji}>🏏</Text>
            <Text style={[styles.sportBadgeText, { color: textColor }]}>Cricket</Text>
          </View>
        </View>

        {/* Team selectors */}
        <Text style={[styles.sectionLabel, { color: mutedColor }]}>TEAM 1 — YOUR TEAM</Text>
        <TeamSlot
          label="Select Your Team"
          team={team1}
          onPress={() => setShowT1Modal(true)}
          isDark={isDark}
        />

        {/* VS divider */}
        <View style={styles.vsDivider}>
          <View style={[styles.vsDividerLine, { backgroundColor: isDark ? '#2a2a2a' : '#e5e5e5' }]} />
          <View style={styles.vsBadge}>
            <Text style={styles.vsBadgeText}>VS</Text>
          </View>
          <View style={[styles.vsDividerLine, { backgroundColor: isDark ? '#2a2a2a' : '#e5e5e5' }]} />
        </View>

        <Text style={[styles.sectionLabel, { color: mutedColor }]}>TEAM 2 — OPPONENT</Text>
        <TeamSlot
          label="Find Opponent Team"
          team={team2}
          onPress={() => setShowT2Modal(true)}
          isDark={isDark}
        />

        {/* Rules validation card */}
        {validation && (
          <View style={[styles.rulesCard, { backgroundColor: cardBg }]}>
            <View style={styles.rulesHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color={validation.allPass ? '#22c55e' : '#f59e0b'} />
              <Text style={[styles.rulesTitle, { color: textColor }]}>Cricket Rules Check</Text>
              {validation.allPass && (
                <View style={styles.allPassBadge}>
                  <Text style={styles.allPassText}>All Good</Text>
                </View>
              )}
            </View>
            <View style={styles.rulesList}>
              {validation.rules.map(r => <RuleRow key={r.id} rule={r} />)}
            </View>
          </View>
        )}

        {/* Start button */}
        {team1 && team2 && (
          <TouchableOpacity
            style={[
              styles.startBtn,
              !validation?.allPass && styles.startBtnDisabled,
            ]}
            onPress={handleStart}
            disabled={!validation?.allPass}
            activeOpacity={0.85}
          >
            <Ionicons name="play-circle" size={22} color="#fff" />
            <Text style={styles.startBtnText}>
              {validation?.allPass ? 'Start Match' : 'Fix issues above first'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Helper text when no teams */}
        {!team1 && !team2 && !loadingTeams && myTeams.length === 0 && (
          <View style={[styles.noTeamsBox, { backgroundColor: cardBg }]}>
            <Ionicons name="people-outline" size={36} color="#ccc" />
            <Text style={[styles.noTeamsText, { color: mutedColor }]}>You have no teams yet.</Text>
            <TouchableOpacity onPress={() => router.push('/create-team')}>
              <Text style={[styles.noTeamsLink]}>Create a team first →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Team 1 picker */}
      <MyTeamsModal
        visible={showT1Modal}
        teams={myTeams}
        onSelect={selectTeam1}
        onClose={() => setShowT1Modal(false)}
        excludeId={team2?.id}
        isDark={isDark}
      />

      {/* Team 2 search */}
      <TeamSearchModal
        visible={showT2Modal}
        onSelect={selectTeam2}
        onClose={() => setShowT2Modal(false)}
        excludeId={team1?.id}
        isDark={isDark}
      />

      {/* Ready popup */}
      <ReadyPopup
        visible={showReady}
        team1={team1}
        team2={team2}
        onClose={() => setShowReady(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold' },
  scroll: { padding: 16, paddingBottom: 48, gap: 14 },

  sportBadgeRow: { alignItems: 'center' },
  sportBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sportBadgeEmoji: { fontSize: 20 },
  sportBadgeText: { fontSize: 14, fontFamily: 'Poppins_700Bold' },

  sectionLabel: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1.2, marginBottom: -6 },

  // Team slot
  teamSlot: { borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
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

  // VS
  vsDivider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vsDividerLine: { flex: 1, height: 1 },
  vsBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  vsBadgeText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_800ExtraBold' },

  // Rules card
  rulesCard: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3, gap: 12 },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rulesTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold', flex: 1 },
  allPassBadge: { backgroundColor: '#22c55e18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  allPassText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: '#22c55e' },
  rulesList: { gap: 8 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleIcon: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  ruleLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', flex: 1 },
  ruleDetail: { fontSize: 12 },

  // Start button
  startBtn: { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  startBtnDisabled: { backgroundColor: '#ccc' },
  startBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },

  noTeamsBox: { borderRadius: 14, padding: 28, alignItems: 'center', gap: 8 },
  noTeamsText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  noTeamsLink: { color: ACCENT, fontSize: 14, fontFamily: 'Poppins_600SemiBold' },

  // ── Modals ──────────────────────────────────────────────────────────────────

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', textAlign: 'center', flex: 1 },
  sheetCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  pickerEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  pickerEmptyText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  pickerItemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: ACCENT + '15', justifyContent: 'center', alignItems: 'center' },
  pickerItemEmoji: { fontSize: 22 },
  pickerItemInfo: { flex: 1 },
  pickerItemName: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  pickerItemMeta: { fontSize: 12, marginTop: 2 },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInputText: { flex: 1, fontSize: 14, fontFamily: 'Poppins_400Regular' },

  // ── Ready popup ──────────────────────────────────────────────────────────────

  popupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  popupCard: { width: '100%', backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  popupBanner: { paddingVertical: 12, alignItems: 'center' },
  popupBannerText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_700Bold', letterSpacing: 1 },
  popupBody: { padding: 24, alignItems: 'center', gap: 12 },
  popupEmoji: { fontSize: 52 },
  popupTitle: { fontSize: 22, fontFamily: 'Poppins_800ExtraBold', color: '#111', textAlign: 'center' },
  popupVsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'center', marginVertical: 4 },
  popupTeamBox: { flex: 1, alignItems: 'center', gap: 4 },
  popupTeamInitials: { width: 52, height: 52, borderRadius: 14, backgroundColor: ACCENT, textAlign: 'center', textAlignVertical: 'center', color: '#fff', fontSize: 18, fontFamily: 'Poppins_800ExtraBold', lineHeight: 52 },
  popupTeamName: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#111', textAlign: 'center' },
  popupTeamCount: { fontSize: 11, color: '#888' },
  popupVsBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  popupVsText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_800ExtraBold' },
  comingSoonBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef9ee', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, width: '100%' },
  comingSoonText: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#f59e0b', flex: 1 },
  comingSoonSub: { fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 },
  popupOkBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 40, marginTop: 4 },
  popupOkText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
})
