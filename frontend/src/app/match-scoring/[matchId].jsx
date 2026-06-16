import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  View, Text as RNText, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, FlatList, Alert, Platform, StatusBar, Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMatch, recordBall, setMatchPlayers, undoLastBall, abandonMatch, API_BASE_URL } from '../../services/api'
import { store } from '../../store'
import PlayerDropdown from '../../components/PlayerDropdown'

const ACCENT = '#C8102E'
const GREEN = '#22c55e'

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function displayOvers(legalBalls) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`
}
function strikeRate(runs, balls) {
  if (!balls) return '0.0'
  return ((runs / balls) * 100).toFixed(1)
}
function economy(runs, balls) {
  if (!balls) return '0.0'
  return ((runs / balls) * 6).toFixed(1)
}
function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// Merge a (possibly lightweight) match update into existing state.
// Live-scoring responses omit team rosters and ball history for innings
// other than the one just played, to keep payloads small as a match grows —
// fall back to whatever we already have for those.
function mergeMatchUpdate(prev, updated) {
  if (!prev || !updated) return updated
  return {
    ...prev,
    ...updated,
    team1: updated.team1 ? { ...prev.team1, ...updated.team1 } : prev.team1,
    team2: updated.team2 ? { ...prev.team2, ...updated.team2 } : prev.team2,
    innings: (updated.innings || []).map(inn => {
      const prevInn = prev.innings?.find(p => p.id === inn.id)
      return { ...inn, balls: inn.balls !== undefined ? inn.balls : (prevInn?.balls || []) }
    }),
  }
}

// Total runs this ball added to the team score (run(s) taken + wide/no-ball penalty).
function ballTotalRuns(ball) {
  const penalty = (ball.extraType === 'WIDE' || ball.extraType === 'NO_BALL') ? 1 : 0
  return ball.runs + penalty
}

function ballColor(ball) {
  if (!ball) return 'rgba(255,255,255,0.15)'
  if (ball.isWicket && ball.wicketType !== 'RETIRED_HURT') return ACCENT
  if (ball.wicketType === 'RETIRED_HURT') return '#f59e0b'
  if (ball.runs === 6) return '#7c3aed'
  if (ball.runs === 4) return '#1d4ed8'
  if (ball.extraType === 'WIDE') return '#d97706'
  if (ball.extraType === 'NO_BALL') return '#c2410c'
  if (ball.extraType === 'LEG_BYE' || ball.extraType === 'BYE') return '#4b5563'
  if (ball.runs === 0) return '#374151'
  return '#15803d'
}

function ballLabel(ball) {
  if (!ball) return ''
  if (ball.isWicket && ball.wicketType !== 'RETIRED_HURT') return 'W'
  if (ball.wicketType === 'RETIRED_HURT') return 'RH'
  if (ball.extraType === 'WIDE') return `Wd${ball.runs > 0 ? `+${ball.runs}` : ''}`
  if (ball.extraType === 'NO_BALL') return `Nb${ball.runs > 0 ? `+${ball.runs}` : ''}`
  if (ball.extraType === 'LEG_BYE') return `Lb${ball.runs > 0 ? ball.runs : ''}`
  if (ball.extraType === 'BYE') return `B${ball.runs > 0 ? ball.runs : ''}`
  return String(ball.runs)
}

function getDismissal(ball, getMemberName) {
  if (!ball) return 'not out'
  const bowler = getMemberName(ball.bowlerId)
  switch (ball.wicketType) {
    case 'BOWLED': return `b. ${bowler}`
    case 'CAUGHT': {
      const catcher = ball.caughtById ? getMemberName(ball.caughtById) : 'field'
      return `c. ${catcher} b. ${bowler}`
    }
    case 'LBW': return `lbw b. ${bowler}`
    case 'STUMPED': return `st. b. ${bowler}`
    case 'RUN_OUT': return 'run out'
    case 'HIT_WICKET': return `hit wkt b. ${bowler}`
    case 'RETIRED_OUT': return 'retired out'
    case 'RETIRED_HURT': return 'retired hurt'
    default: return 'out'
  }
}

// ─── BallDot ──────────────────────────────────────────────────────────────────

function BallDot({ ball, size = 34, isDark }) {
  if (!ball) {
    return (
      <View
        style={[
          styles.ballDot,
          {
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)',
          },
        ]}
      />
    )
  }
  const label = ballLabel(ball)
  const fontSize = label.length > 3 ? size * 0.28 : size * 0.36
  return (
    <View style={[styles.ballDot, { width: size, height: size, borderRadius: size / 2, backgroundColor: ballColor(ball) }]}>
      <Text style={[styles.ballDotText, { fontSize }]}>{label}</Text>
    </View>
  )
}

// ─── RunBtn ───────────────────────────────────────────────────────────────────

const RUN_CFG = {
  0: '#6b7280',
  1: '#16a34a',
  2: '#0d9488',
  3: '#0891b2',
  4: '#2563eb',
  5: '#7c3aed',
  6: '#dc2626',
}

function RunBtn({ runs, onPress, disabled }) {
  const color = RUN_CFG[runs] || '#666'
  return (
    <TouchableOpacity
      style={[styles.runBtn, { backgroundColor: color }, disabled && { opacity: 0.4 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <Text style={styles.runBtnText}>{runs}</Text>
    </TouchableOpacity>
  )
}

// ─── ExtraPickerModal ────────────────────────────────────────────────────────

const EXTRA_LABELS = { WIDE: 'Wide', NO_BALL: 'No Ball', LEG_BYE: 'Leg Bye', BYE: 'Bye' }
const EXTRA_RUN_OPTIONS = {
  WIDE: [1, 2, 3, 4, 5, 6],
  NO_BALL: [1, 2, 3, 4, 5, 6],
  LEG_BYE: [1, 2, 3, 4, 5, 6],
  BYE: [1, 2, 3, 4, 5, 6],
}
const EXTRA_COLORS = {
  WIDE: '#d97706',
  NO_BALL: '#c2410c',
  LEG_BYE: '#4b5563',
  BYE: '#4b5563',
}

function ExtraPickerModal({ visible, extraType, onConfirm, onClose, isDark }) {
  const [runs, setRuns] = useState(0)
  const bg = isDark ? '#1a1a1a' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'
  const options = EXTRA_RUN_OPTIONS[extraType] || [0]
  const accentColor = EXTRA_COLORS[extraType] || '#666'

  useEffect(() => {
    if (visible) setRuns(options[0])
    else setRuns(0)
  }, [visible, extraType])

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <View style={[styles.selectSheet, { backgroundColor: bg, paddingBottom: 28 }]}>
          <View style={styles.sheetHandle} />
          <View style={{ alignItems: 'center', paddingVertical: 16, gap: 4 }}>
            <View style={[styles.extraTypeBadge, { backgroundColor: accentColor }]}>
              <Text style={{ color: '#fff', fontFamily: 'Poppins_800ExtraBold', fontSize: 13 }}>
                {EXTRA_LABELS[extraType] || 'Extra'}
              </Text>
            </View>
            <Text style={{ color: mutedColor, fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 4 }}>
              How many runs scored?
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 20, flexWrap: 'wrap' }}>
            {options.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.extraRunOption, { backgroundColor: runs === r ? accentColor : (isDark ? '#333' : '#f0f0f0') }]}
                onPress={() => setRuns(r)}
                activeOpacity={0.75}
              >
                <Text style={[styles.extraRunOptionText, { color: runs === r ? '#fff' : textColor }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ padding: 20, gap: 10 }}>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: accentColor }]}
              onPress={() => { onConfirm({ extraType, runs }); onClose() }}
            >
              <Text style={styles.nextBtnText}>
                {(() => {
                  const hasPenalty = extraType === 'WIDE' || extraType === 'NO_BALL'
                  const total = hasPenalty ? runs + 1 : runs
                  return `Record ${EXTRA_LABELS[extraType]}  (+${total} run${total !== 1 ? 's' : ''})`
                })()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: mutedColor, fontFamily: 'Poppins_600SemiBold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── AllOversModal ────────────────────────────────────────────────────────────

function AllOversModal({ visible, currentInning, onClose, isDark }) {
  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'

  const balls = currentInning?.balls || []
  const overNumbers = [...new Set(balls.map(b => b.overNumber))].sort((a, b) => a - b)

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={[styles.selectSheet, { backgroundColor: bg, maxHeight: '82%' }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <View style={{ width: 30 }} />
            <Text style={[styles.sheetTitle, { color: textColor }]}>Over-by-Over</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
              <Ionicons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {overNumbers.length === 0 && (
              <Text style={{ color: mutedColor, textAlign: 'center', fontFamily: 'Poppins_400Regular', padding: 20 }}>
                No overs bowled yet
              </Text>
            )}
            {overNumbers.map(overNum => {
              const overBalls = balls.filter(b => b.overNumber === overNum)
              const runsInOver = overBalls.reduce((s, b) => s + ballTotalRuns(b), 0)
              const wicketsInOver = overBalls.filter(b => b.isWicket && b.wicketType !== 'RETIRED_HURT').length
              const legalCount = overBalls.filter(b => b.extraType !== 'WIDE' && b.extraType !== 'NO_BALL').length
              const extraBallsInOver = overBalls.filter(b => b.extraType === 'WIDE' || b.extraType === 'NO_BALL').length
              const overSlots = Math.max(6 + extraBallsInOver, overBalls.length)

              return (
                <View key={overNum} style={[styles.overCard, { backgroundColor: cardBg }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ color: mutedColor, fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 1 }}>
                      OVER {overNum}  ·  {legalCount}/6
                    </Text>
                    <Text style={{ color: textColor, fontSize: 14, fontFamily: 'Poppins_800ExtraBold' }}>
                      {runsInOver}{wicketsInOver > 0 ? `-${wicketsInOver}W` : ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {Array.from({ length: overSlots }).map((_, i) => (
                      <BallDot key={overBalls[i]?.id || i} ball={overBalls[i] || null} size={32} isDark={isDark} />
                    ))}
                  </View>
                </View>
              )
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ─── SelectPlayerModal ────────────────────────────────────────────────────────

function SelectPlayerModal({ visible, title, players, onSelect, onClose, isDark, excludeIds = [] }) {
  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'
  const available = players.filter(p => !excludeIds.includes(p.userId))

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={[styles.selectSheet, { backgroundColor: bg }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <View style={{ width: 32 }} />
            <Text style={[styles.sheetTitle, { color: textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
              <Ionicons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          {available.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 32, gap: 8 }}>
              <Ionicons name="sad-outline" size={40} color="#ccc" />
              <Text style={{ color: mutedColor, fontFamily: 'Poppins_600SemiBold' }}>No players available</Text>
            </View>
          ) : (
            <FlatList
              data={available}
              keyExtractor={p => p.userId}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.playerSelectRow, { backgroundColor: cardBg }]} onPress={() => onSelect(item)} activeOpacity={0.8}>
                  <View style={styles.pSelectAvatar}>
                    <Text style={styles.pSelectAvatarText}>{initials(item.user?.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pSelectName, { color: textColor }]}>{item.user?.fullName}</Text>
                    <Text style={[styles.pSelectRole, { color: mutedColor }]}>{item.role}</Text>
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

// ─── WicketModal ──────────────────────────────────────────────────────────────

const WICKET_TYPES_CONFIG = [
  { type: 'BOWLED',       label: 'Bowled',       icon: '🎯' },
  { type: 'CAUGHT',       label: 'Caught',       icon: '🙌' },
  { type: 'LBW',          label: 'LBW',          icon: '🦵' },
  { type: 'STUMPED',      label: 'Stumped',      icon: '🥅' },
  { type: 'RUN_OUT',      label: 'Run Out',      icon: '🏃' },
  { type: 'HIT_WICKET',   label: 'Hit Wicket',   icon: '💥' },
  { type: 'RETIRED_OUT',  label: 'Retired Out',  icon: '⛔' },
  { type: 'RETIRED_HURT', label: 'Retired Hurt', icon: '🤕' },
]

function WicketModal({ visible, battingTeamMembers, bowlingTeamMembers, outBatsmanIds, activeBatsmenIds, onConfirm, onClose, isDark }) {
  const [wicketType, setWicketType] = useState(null)
  const [newBatsmanId, setNewBatsmanId] = useState(null)
  const [caughtById, setCaughtById] = useState(null)
  const [subStep, setSubStep] = useState('TYPE') // TYPE | CAUGHT_BY | NEXT_BATSMAN

  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'

  const isCaught = wicketType === 'CAUGHT'
  const isRetiredHurt = wicketType === 'RETIRED_HURT'

  const available = battingTeamMembers.filter(
    m => !outBatsmanIds.includes(m.userId) && !activeBatsmenIds.includes(m.userId)
  )
  const needsNewBatsman = available.length > 0

  useEffect(() => {
    if (!visible) {
      setWicketType(null); setNewBatsmanId(null); setCaughtById(null); setSubStep('TYPE')
    }
  }, [visible])

  const selectWicketType = (type) => {
    setWicketType(type)
    setCaughtById(null)
    setNewBatsmanId(null)
    if (type === 'CAUGHT') setSubStep('CAUGHT_BY')
    else if (needsNewBatsman) setSubStep('NEXT_BATSMAN')
    else setSubStep('TYPE')
  }

  const selectCaughtBy = (id) => {
    setCaughtById(id)
    if (needsNewBatsman) setSubStep('NEXT_BATSMAN')
  }

  const goBack = () => {
    if (subStep === 'NEXT_BATSMAN') {
      setNewBatsmanId(null)
      setSubStep(isCaught ? 'CAUGHT_BY' : 'TYPE')
    } else if (subStep === 'CAUGHT_BY') {
      setCaughtById(null)
      setSubStep('TYPE')
    }
  }

  const canConfirm = !!wicketType &&
    (!isCaught || !!caughtById) &&
    (!needsNewBatsman || !!newBatsmanId)

  const headerSub = subStep === 'TYPE' ? 'How was the batsman out?'
    : subStep === 'CAUGHT_BY' ? 'Who took the catch?'
    : (isRetiredHurt ? 'Temporary replacement' : 'Next batsman')

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <View style={[styles.selectSheet, { backgroundColor: bg, maxHeight: '88%' }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            {subStep !== 'TYPE' ? (
              <TouchableOpacity onPress={goBack} style={styles.sheetCloseBtn}>
                <Ionicons name="arrow-back" size={18} color="#666" />
              </TouchableOpacity>
            ) : <View style={{ width: 32 }} />}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.sheetTitle, { color: textColor, flex: 0 }]}>Wicket!</Text>
              <Text style={{ color: mutedColor, fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 }}>{headerSub}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
              <Ionicons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            {/* Step 1: How out */}
            {subStep === 'TYPE' && (
              <>
                <Text style={[styles.sectionLabel, { color: mutedColor }]}>HOW OUT?</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {WICKET_TYPES_CONFIG.map(({ type, label, icon }) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.wicketTypeBtn,
                        { backgroundColor: cardBg },
                        wicketType === type && { backgroundColor: ACCENT },
                      ]}
                      onPress={() => selectWicketType(type)}
                    >
                      <Text style={{ fontSize: 15 }}>{icon}</Text>
                      <Text style={[styles.wicketTypeBtnText, wicketType === type && { color: '#fff' }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {isRetiredHurt && (
                  <View style={{ padding: 12, backgroundColor: isDark ? '#422006' : '#fef3c7', borderRadius: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 18 }}>🤕</Text>
                    <Text style={{ color: isDark ? '#fde68a' : '#92400e', fontFamily: 'Poppins_600SemiBold', fontSize: 13, flex: 1 }}>
                      Retired Hurt — player is NOT out and can return to bat later.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Step 2: Caught by — only when CAUGHT */}
            {subStep === 'CAUGHT_BY' && (
              <>
                <Text style={[styles.sectionLabel, { color: mutedColor }]}>CAUGHT BY</Text>
                <View style={{ gap: 8 }}>
                  {bowlingTeamMembers.map(m => (
                    <TouchableOpacity
                      key={m.userId}
                      style={[
                        styles.playerSelectRow,
                        { backgroundColor: cardBg },
                        caughtById === m.userId && { backgroundColor: '#1d4ed8' },
                      ]}
                      onPress={() => selectCaughtBy(m.userId)}
                    >
                      <View style={[styles.pSelectAvatar, caughtById === m.userId && { backgroundColor: '#fff' }]}>
                        <Text style={[styles.pSelectAvatarText, caughtById === m.userId && { color: '#1d4ed8' }]}>
                          {initials(m.user?.fullName)}
                        </Text>
                      </View>
                      <Text style={[styles.pSelectName, { color: caughtById === m.userId ? '#fff' : textColor }]}>
                        {m.user?.fullName}
                      </Text>
                      {caughtById === m.userId && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Step 3: Next batsman */}
            {subStep === 'NEXT_BATSMAN' && (
              <>
                {isCaught && caughtById && (
                  <View style={[styles.playerSelectRow, { backgroundColor: cardBg, opacity: 0.7 }]}>
                    <View style={[styles.pSelectAvatar, { backgroundColor: '#1d4ed8' }]}>
                      <Text style={[styles.pSelectAvatarText, { color: '#fff' }]}>{initials(bowlingTeamMembers.find(m => m.userId === caughtById)?.user?.fullName)}</Text>
                    </View>
                    <Text style={[styles.pSelectName, { color: textColor }]}>
                      Caught by {bowlingTeamMembers.find(m => m.userId === caughtById)?.user?.fullName}
                    </Text>
                    <Ionicons name="checkmark-circle" size={20} color={GREEN} />
                  </View>
                )}

                {isRetiredHurt && (
                  <View style={{ padding: 12, backgroundColor: isDark ? '#422006' : '#fef3c7', borderRadius: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 18 }}>🤕</Text>
                    <Text style={{ color: isDark ? '#fde68a' : '#92400e', fontFamily: 'Poppins_600SemiBold', fontSize: 13, flex: 1 }}>
                      Retired Hurt — player is NOT out and can return to bat later.
                    </Text>
                  </View>
                )}

                <Text style={[styles.sectionLabel, { color: mutedColor }]}>
                  {isRetiredHurt ? 'TEMPORARY REPLACEMENT' : 'NEXT BATSMAN'}
                </Text>
                <View style={{ gap: 8 }}>
                  {available.map(m => (
                    <TouchableOpacity
                      key={m.userId}
                      style={[
                        styles.playerSelectRow,
                        { backgroundColor: cardBg },
                        newBatsmanId === m.userId && { backgroundColor: ACCENT },
                      ]}
                      onPress={() => setNewBatsmanId(m.userId)}
                    >
                      <View style={[styles.pSelectAvatar, newBatsmanId === m.userId && { backgroundColor: '#fff' }]}>
                        <Text style={[styles.pSelectAvatarText, newBatsmanId === m.userId && { color: ACCENT }]}>
                          {initials(m.user?.fullName)}
                        </Text>
                      </View>
                      <Text style={[styles.pSelectName, { color: newBatsmanId === m.userId ? '#fff' : textColor }]}>
                        {m.user?.fullName}
                      </Text>
                      {newBatsmanId === m.userId && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 24 : 16, borderTopWidth: 1, borderTopColor: isDark ? '#222' : '#eee' }}>
            <TouchableOpacity
              style={[styles.confirmWicketBtn, !canConfirm && { backgroundColor: '#ccc' }]}
              onPress={() => canConfirm && onConfirm({ wicketType, newBatsmanId, caughtById })}
              disabled={!canConfirm}
            >
              <Text style={styles.confirmWicketBtnText}>Confirm Wicket</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── RetirementModal ──────────────────────────────────────────────────────────

const RETIREMENT_OPTIONS = [
  { type: 'RETIRED_HURT', label: 'Retired Hurt', icon: '🤕', color: '#f59e0b', desc: 'Not out — can return later' },
  { type: 'RETIRED_OUT', label: 'Retired Out', icon: '⛔', color: ACCENT, desc: 'Out — replaced permanently' },
]

function RetirementModal({ visible, playerName, battingTeamMembers, outBatsmanIds, activeBatsmenIds, onConfirm, onClose, isDark }) {
  const [wicketType, setWicketType] = useState(null)
  const [newBatsmanId, setNewBatsmanId] = useState(null)

  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'

  const available = battingTeamMembers.filter(
    m => !outBatsmanIds.includes(m.userId) && !activeBatsmenIds.includes(m.userId)
  )

  useEffect(() => {
    if (!visible) { setWicketType(null); setNewBatsmanId(null) }
  }, [visible])

  const canConfirm = !!wicketType && (available.length === 0 || !!newBatsmanId)

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <View style={[styles.selectSheet, { backgroundColor: bg, maxHeight: '85%' }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <View style={{ width: 32 }} />
            <Text style={[styles.sheetTitle, { color: textColor }]}>Change Batsman</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
              <Ionicons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 12 }}>
            <Text style={{ color: mutedColor, fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center' }}>
              Why is {playerName || 'the batsman'} leaving the field?
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {RETIREMENT_OPTIONS.map(opt => {
                const active = wicketType === opt.type
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[styles.retireOptionCard, { backgroundColor: cardBg }, active && { backgroundColor: opt.color }]}
                    onPress={() => { setWicketType(opt.type); setNewBatsmanId(null) }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontSize: 28 }}>{opt.icon}</Text>
                    <Text style={[styles.retireOptionLabel, { color: active ? '#fff' : textColor }]}>{opt.label}</Text>
                    <Text style={[styles.retireOptionDesc, { color: active ? 'rgba(255,255,255,0.85)' : mutedColor }]}>{opt.desc}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {wicketType && available.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: mutedColor }]}>
                  {wicketType === 'RETIRED_HURT' ? 'TEMPORARY REPLACEMENT' : 'NEXT BATSMAN'}
                </Text>
                <View style={{ gap: 8 }}>
                  {available.map(m => (
                    <TouchableOpacity
                      key={m.userId}
                      style={[
                        styles.playerSelectRow,
                        { backgroundColor: cardBg },
                        newBatsmanId === m.userId && { backgroundColor: ACCENT },
                      ]}
                      onPress={() => setNewBatsmanId(m.userId)}
                    >
                      <View style={[styles.pSelectAvatar, newBatsmanId === m.userId && { backgroundColor: '#fff' }]}>
                        <Text style={[styles.pSelectAvatarText, newBatsmanId === m.userId && { color: ACCENT }]}>
                          {initials(m.user?.fullName)}
                        </Text>
                      </View>
                      <Text style={[styles.pSelectName, { color: newBatsmanId === m.userId ? '#fff' : textColor }]}>
                        {m.user?.fullName}
                      </Text>
                      {newBatsmanId === m.userId && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 24 : 16, borderTopWidth: 1, borderTopColor: isDark ? '#222' : '#eee' }}>
            <TouchableOpacity
              style={[styles.confirmWicketBtn, !canConfirm && { backgroundColor: '#ccc' }]}
              onPress={() => canConfirm && onConfirm({ wicketType, newBatsmanId })}
              disabled={!canConfirm}
            >
              <Text style={styles.confirmWicketBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── BowlerRetirementModal ─────────────────────────────────────────────────────

const BOWLER_RETIREMENT_OPTIONS = [
  { type: 'RETIRED_HURT', label: 'Retired Hurt', icon: '🤕', color: '#f59e0b', desc: 'Injured — may bowl again later' },
  { type: 'RETIRED_OUT', label: 'Unavailable', icon: '⛔', color: ACCENT, desc: 'Cannot continue bowling' },
]

function BowlerRetirementModal({ visible, playerName, onConfirm, onClose, isDark }) {
  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <View style={[styles.selectSheet, { backgroundColor: bg, paddingBottom: 28 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <View style={{ width: 32 }} />
            <Text style={[styles.sheetTitle, { color: textColor }]}>Change Bowler</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
              <Ionicons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 14 }}>
            <Text style={{ color: mutedColor, fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center' }}>
              Why is {playerName || 'the bowler'} leaving mid-over? The new bowler will continue this same over.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {BOWLER_RETIREMENT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.retireOptionCard, { backgroundColor: cardBg }]}
                  onPress={() => onConfirm(opt.type)}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontSize: 28 }}>{opt.icon}</Text>
                  <Text style={[styles.retireOptionLabel, { color: textColor }]}>{opt.label}</Text>
                  <Text style={[styles.retireOptionDesc, { color: mutedColor }]}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── InningsBreakView ─────────────────────────────────────────────────────────

function InningsBreakView({ match, onSetPlayers, isDark, isCreator }) {
  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'

  const inning1 = match.innings?.find(i => i.inningNumber === 1)
  const inning2 = match.innings?.find(i => i.inningNumber === 2)
  const battingTeam = inning2?.battingTeamId === match.team1Id ? match.team1 : match.team2
  const bowlingTeam = inning2?.battingTeamId === match.team1Id ? match.team2 : match.team1

  const [batsmen, setBatsmen] = useState([null, null])
  const [bowler, setBowler] = useState(null)
  const [saving, setSaving] = useState(false)
  const insets = useSafeAreaInsets()

  const lineupReady = !!(batsmen[0] && batsmen[1] && bowler)

  const startFooterAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.spring(startFooterAnim, {
      toValue: lineupReady ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start()
  }, [lineupReady])

  const handleStart2nd = async () => {
    if (!batsmen[0] || !batsmen[1] || !bowler) return
    setSaving(true)
    try {
      await onSetPlayers({ strikerBatsmanId: batsmen[0], nonStrikerBatsmanId: batsmen[1], currentBowlerId: bowler })
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to start 2nd innings')
    } finally {
      setSaving(false)
    }
  }

  if (!inning1) return null
  const targetRuns = inning1.totalRuns + 1

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: lineupReady ? 110 + insets.bottom : 20 }}>
        <LinearGradient colors={['#1e40af', '#3b82f6']} style={styles.inningsBreakBanner}>
          <Ionicons name="time-outline" size={28} color="#fff" />
          <Text style={styles.inningsBreakTitle}>Innings Break</Text>
          <Text style={styles.inningsBreakSub}>1st Innings Complete</Text>
        </LinearGradient>

        <View style={[styles.scoreCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.scoreCardLabel, { color: mutedColor }]}>1ST INNINGS</Text>
          <Text style={[styles.scoreCardBig, { color: textColor }]}>{inning1.totalRuns}/{inning1.totalWickets}</Text>
          <Text style={[styles.scoreCardSub, { color: mutedColor }]}>{displayOvers(inning1.legalBalls)} overs</Text>
        </View>

        <LinearGradient colors={[ACCENT, '#a00d24']} style={styles.targetBanner}>
          <Text style={styles.targetLabel}>TARGET</Text>
          <Text style={styles.targetNum}>{targetRuns}</Text>
          <Text style={styles.targetSub}>{battingTeam?.name} need {targetRuns} runs to win</Text>
        </LinearGradient>

        {isCreator && (
          <>
            <Text style={[styles.askTitle, { color: textColor }]}>Set 2nd Innings Lineup</Text>
            <Text style={[styles.askSub, { color: mutedColor }]}>Tap each row to choose a player</Text>

            <View style={{ gap: 10 }}>
              <PlayerDropdown
                label="Striker" icon="🏏"
                players={battingTeam?.members || []}
                value={batsmen[0]}
                onChange={id => setBatsmen([id, batsmen[1]])}
                excludeIds={[batsmen[1]].filter(Boolean)}
                accentColor={ACCENT}
                isDark={isDark}
              />
              <PlayerDropdown
                label="Non-Striker" icon="🏃"
                players={battingTeam?.members || []}
                value={batsmen[1]}
                onChange={id => setBatsmen([batsmen[0], id])}
                excludeIds={[batsmen[0]].filter(Boolean)}
                disabled={!batsmen[0]}
                accentColor="#f59e0b"
                isDark={isDark}
              />
              <PlayerDropdown
                label="Opening Bowler" icon="⚾"
                players={bowlingTeam?.members || []}
                value={bowler}
                onChange={setBowler}
                disabled={!batsmen[0] || !batsmen[1]}
                accentColor="#1d4ed8"
                isDark={isDark}
              />
            </View>
          </>
        )}

        {!isCreator && (
          <View style={{ alignItems: 'center', gap: 8, marginTop: 20 }}>
            <Text style={{ color: mutedColor, fontFamily: 'Poppins_600SemiBold' }}>Waiting for 2nd innings to start…</Text>
          </View>
        )}
      </ScrollView>

      {/* Sliding "Start 2nd Innings" footer — appears once striker, non-striker & bowler are all set */}
      {isCreator && (
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
            style={[styles.nextBtn, { backgroundColor: GREEN }, (!lineupReady || saving) && styles.nextBtnDisabled]}
            onPress={handleStart2nd}
            disabled={!lineupReady || saving}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="play-circle" size={20} color="#fff" />
                <Text style={styles.nextBtnText}>Start 2nd Innings</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  )
}

// ─── AbandonMatchModal ────────────────────────────────────────────────────────

function AbandonMatchModal({ visible, team1, team2, onConfirm, onClose, isDark, submitting }) {
  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'

  const options = [
    {
      key: 'team1',
      icon: 'trophy',
      color: '#22c55e',
      title: `${team1?.name || 'Team 1'} wins`,
      desc: `${team2?.name || 'Team 2'} did not show up`,
      winnerTeamId: team1?.id,
      reason: 'opponent did not show up',
    },
    {
      key: 'team2',
      icon: 'trophy',
      color: '#22c55e',
      title: `${team2?.name || 'Team 2'} wins`,
      desc: `${team1?.name || 'Team 1'} did not show up`,
      winnerTeamId: team2?.id,
      reason: 'opponent did not show up',
    },
    {
      key: 'none',
      icon: 'close-circle',
      color: ACCENT,
      title: 'Abandon match',
      desc: 'No result — e.g. rain, ground unavailable',
      winnerTeamId: null,
      reason: null,
    },
  ]

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <View style={[styles.selectSheet, { backgroundColor: bg, paddingBottom: 28 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <View style={{ width: 32 }} />
            <Text style={[styles.sheetTitle, { color: textColor }]}>End Match</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn} disabled={submitting}>
              <Ionicons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            <Text style={{ color: mutedColor, fontFamily: 'Poppins_400Regular', fontSize: 13, marginBottom: 4 }}>
              Use this if the match can't continue normally — for example one team didn't turn up, or it's been called off.
            </Text>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.playerSelectRow, { backgroundColor: cardBg }, submitting && { opacity: 0.6 }]}
                onPress={() => !submitting && onConfirm(opt)}
                activeOpacity={0.8}
                disabled={submitting}
              >
                <View style={[styles.pSelectAvatar, { backgroundColor: opt.color + '20' }]}>
                  <Ionicons name={opt.icon} size={20} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pSelectName, { color: textColor }]}>{opt.title}</Text>
                  <Text style={[styles.pSelectRole, { color: mutedColor }]}>{opt.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={mutedColor} />
              </TouchableOpacity>
            ))}
            {submitting && <ActivityIndicator color={ACCENT} style={{ marginTop: 4 }} />}
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Scorecard Block ──────────────────────────────────────────────────────────

function ScorecardBlock({ inn, match, allPlayers, getMemberName, cardBg, textColor, mutedColor }) {
  const battingTeam = inn.battingTeamId === match.team1Id ? match.team1 : match.team2

  // A batsman has "entered" the innings if they ever stood at the crease —
  // covers a not-out partner who faced 0 balls (e.g. the chase ended on the
  // other end's shot), who would otherwise wrongly show as "yet to bat".
  const enteredBatsmenIds = new Set()
  for (const b of inn.balls || []) {
    if (b.batsmanId) enteredBatsmenIds.add(b.batsmanId)
    if (b.prevStrikerBatsmanId) enteredBatsmenIds.add(b.prevStrikerBatsmanId)
    if (b.prevNonStrikerBatsmanId) enteredBatsmenIds.add(b.prevNonStrikerBatsmanId)
  }
  const hasBatted = p => p.ballsFaced > 0 || p.isOut || enteredBatsmenIds.has(p.userId)

  // All batting-team players, ordered: currently batting → out → yet to bat
  const rawBatters = allPlayers.filter(p => p.teamId === inn.battingTeamId)
  const currentlyBattingIds = match.status === 'IN_PROGRESS' && inn.inningNumber === match.currentInning
    ? [match.strikerBatsmanId, match.nonStrikerBatsmanId].filter(Boolean)
    : []
  const battingPlayers = [...rawBatters].sort((a, b) => {
    const rank = p => currentlyBattingIds.includes(p.userId) ? 0 : p.isOut ? 1 : hasBatted(p) ? 2 : 3
    return rank(a) - rank(b)
  })
  const playedBatters = battingPlayers.filter(p => hasBatted(p) || currentlyBattingIds.includes(p.userId))
  const yetToBat = battingPlayers.filter(p => !(hasBatted(p) || currentlyBattingIds.includes(p.userId)))
  const bowlingPlayers = allPlayers.filter(p => p.teamId === inn.bowlingTeamId && p.legalBallsBowled > 0)

  return (
    <View style={[styles.scorecardBlock, { backgroundColor: cardBg }]}>
      <View style={styles.scorecardHeader}>
        <Text style={[styles.scorecardTeamName, { color: textColor }]}>{battingTeam?.name}</Text>
        <Text style={[styles.scorecardScore, { color: ACCENT }]}>{inn.totalRuns}/{inn.totalWickets}</Text>
        <Text style={[styles.scorecardOvers, { color: mutedColor }]}>{displayOvers(inn.legalBalls)} ov</Text>
      </View>

      {/* Batting */}
      <View style={styles.scorecardTableHeader}>
        <Text style={[styles.scorecardColHead, { flex: 1, color: mutedColor }]}>BATTER</Text>
        <Text style={[styles.scorecardColHead, styles.scorecardRCol, { color: mutedColor }]}>R</Text>
        <Text style={[styles.scorecardColHead, { width: 32, color: mutedColor, textAlign: 'center' }]}>B</Text>
        <Text style={[styles.scorecardColHead, { width: 32, color: mutedColor, textAlign: 'center' }]}>4s</Text>
        <Text style={[styles.scorecardColHead, { width: 32, color: mutedColor, textAlign: 'center' }]}>6s</Text>
        <Text style={[styles.scorecardColHead, styles.scorecardWideCol, { color: mutedColor }]}>SR</Text>
      </View>
      {playedBatters.map(p => {
        const isBatting = currentlyBattingIds.includes(p.userId)
        const wicketBall = (inn.balls || []).find(b => b.batsmanId === p.userId && b.isWicket)
        let dismissal, dismissalColor
        if (p.isOut) {
          dismissal = getDismissal(wicketBall, getMemberName)
          dismissalColor = ACCENT
        } else if (isBatting) {
          dismissal = '● batting'
          dismissalColor = GREEN
        } else if (wicketBall?.wicketType === 'RETIRED_HURT') {
          dismissal = 'retired hurt'
          dismissalColor = '#f59e0b'
        } else {
          dismissal = 'not out'
          dismissalColor = mutedColor
        }
        return (
          <View key={p.userId} style={styles.scorecardBatterRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scorecardPlayer, { color: textColor }]} numberOfLines={1}>{p.user?.fullName}</Text>
              <Text style={[styles.dismissalText, { color: dismissalColor }]} numberOfLines={1}>{dismissal}</Text>
            </View>
            <Text style={[styles.scorecardRunsCell, styles.scorecardRCol, { color: textColor }]}>{p.runsScored}</Text>
            <Text style={[styles.scorecardCell, { color: mutedColor }]}>{p.ballsFaced}</Text>
            <Text style={[styles.scorecardCell, { color: '#1d4ed8' }]}>{p.fours}</Text>
            <Text style={[styles.scorecardCell, { color: '#7c3aed' }]}>{p.sixes}</Text>
            <Text style={[styles.scorecardCell, styles.scorecardWideCol, { color: mutedColor }]} numberOfLines={1}>{strikeRate(p.runsScored, p.ballsFaced)}</Text>
          </View>
        )
      })}
      {inn.extras > 0 && (
        <View style={[styles.scorecardBatterRow, { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', marginTop: 4 }]}>
          <Text style={[styles.dismissalText, { flex: 1, color: mutedColor }]}>Extras</Text>
          <Text style={[styles.scorecardRunsCell, styles.scorecardRCol, { color: mutedColor }]}>{inn.extras}</Text>
        </View>
      )}
      {yetToBat.length > 0 && (
        <View style={styles.yetToBatRow}>
          <Text style={[styles.dismissalText, { color: mutedColor }]}>
            <Text style={{ fontFamily: 'Poppins_700Bold' }}>Yet to bat: </Text>
            {yetToBat.map(p => p.user?.fullName).join(', ')}
          </Text>
        </View>
      )}

      {/* Bowling */}
      {bowlingPlayers.length > 0 && (
        <>
          <View style={[styles.scorecardTableHeader, { marginTop: 14 }]}>
            <Text style={[styles.scorecardColHead, { flex: 1, color: mutedColor }]}>BOWLER</Text>
            <Text style={[styles.scorecardColHead, { width: 40, color: mutedColor, textAlign: 'center' }]}>O</Text>
            <Text style={[styles.scorecardColHead, styles.scorecardRCol, { color: mutedColor }]}>R</Text>
            <Text style={[styles.scorecardColHead, { width: 32, color: mutedColor, textAlign: 'center' }]}>W</Text>
            <Text style={[styles.scorecardColHead, styles.scorecardWideCol, { color: mutedColor }]}>Eco</Text>
          </View>
          {bowlingPlayers.map(p => (
            <View key={p.userId} style={styles.scorecardBatterRow}>
              <Text style={[styles.scorecardPlayer, { flex: 1, color: textColor }]} numberOfLines={1}>{p.user?.fullName}</Text>
              <Text style={[styles.scorecardCell, { width: 40, textAlign: 'center', color: textColor }]}>{displayOvers(p.legalBallsBowled)}</Text>
              <Text style={[styles.scorecardCell, styles.scorecardRCol, { color: textColor }]}>{p.runsConceded}</Text>
              <Text style={[styles.scorecardCell, { width: 32, textAlign: 'center', color: ACCENT, fontFamily: 'Poppins_700Bold' }]}>{p.wicketsTaken}</Text>
              <Text style={[styles.scorecardCell, styles.scorecardWideCol, { color: mutedColor }]} numberOfLines={1}>{economy(p.runsConceded, p.legalBallsBowled)}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  )
}

// ─── Result Screen ────────────────────────────────────────────────────────────

function ResultScreen({ match, isDark }) {
  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'

  const allPlayers = match.players || []
  const allMembers = [...(match?.team1?.members || []), ...(match?.team2?.members || [])]
  const getMemberName = (userId) => allMembers.find(m => m.userId === userId)?.user?.fullName || '?'

  const getBestPlayer = (userId) => allPlayers.find(p => p.userId === userId)
  const bestBat = getBestPlayer(match.bestBatsmanId)
  const bestBowl = getBestPlayer(match.bestBowlerId)
  const mvp = getBestPlayer(match.mvpId)

  const awardCards = [
    { icon: '🏏', label: 'Best Batsman', player: bestBat, detail: bestBat ? `${bestBat.runsScored} runs off ${bestBat.ballsFaced} balls  ·  SR ${strikeRate(bestBat.runsScored, bestBat.ballsFaced)}` : '' },
    { icon: '⚾', label: 'Best Bowler', player: bestBowl, detail: bestBowl ? `${bestBowl.wicketsTaken}/${bestBowl.runsConceded}  ·  ${displayOvers(bestBowl.legalBallsBowled)} ov  ·  Eco ${economy(bestBowl.runsConceded, bestBowl.legalBallsBowled)}` : '' },
    { icon: '⭐', label: 'Player of the Match', player: mvp, detail: mvp ? `${mvp.runsScored}R · ${mvp.wicketsTaken}W · ${mvp.fours}×4 · ${mvp.sixes}×6` : '' },
  ]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <LinearGradient colors={[ACCENT, '#ff6b35']} style={styles.winnerBanner}>
        <Text style={styles.winnerTrophy}>🏆</Text>
        <Text style={styles.winnerLabel}>MATCH RESULT</Text>
        <Text style={styles.winnerResult}>{match.result || 'Match Completed'}</Text>
      </LinearGradient>

      {match.innings?.filter(Boolean).map(inn => (
        <ScorecardBlock key={inn.id} inn={inn} match={match} allPlayers={allPlayers}
          getMemberName={getMemberName} cardBg={cardBg} textColor={textColor} mutedColor={mutedColor} />
      ))}

      <Text style={[styles.sectionLabel, { color: mutedColor, marginTop: 4 }]}>AWARDS</Text>
      {awardCards.filter(a => a.player).map(a => (
        <View key={a.label} style={[styles.awardCard, { backgroundColor: cardBg }]}>
          <Text style={styles.awardEmoji}>{a.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.awardLabel, { color: mutedColor }]}>{a.label}</Text>
            <Text style={[styles.awardName, { color: textColor }]}>{a.player?.user?.fullName}</Text>
            <Text style={[styles.awardDetail, { color: ACCENT }]}>{a.detail}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MatchScoringScreen() {
  const { matchId } = useLocalSearchParams()
  const router = useRouter()
  const theme = useSelector(s => s.user.theme)
  const currentUser = useSelector(s => s.user.user)
  const insets = useSafeAreaInsets()
  const isDark = theme === 'dark'
  const bg = isDark ? '#0a0a0a' : '#f0f0f0'
  const cardBg = isDark ? '#1a1a1a' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#666'

  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showWicket, setShowWicket] = useState(false)
  const [showChangeBowler, setShowChangeBowler] = useState(false)
  const [showBowlerRetirement, setShowBowlerRetirement] = useState(false)
  const [midOverBowlerChange, setMidOverBowlerChange] = useState(false)
  const [showChangeBatsman, setShowChangeBatsman] = useState(false)
  const [showDirectBatsmanChange, setShowDirectBatsmanChange] = useState(false)
  const [showScorecard, setShowScorecard] = useState(false)
  const [showAllOvers, setShowAllOvers] = useState(false)
  const [extraPickerType, setExtraPickerType] = useState(null)
  const [showAbandon, setShowAbandon] = useState(false)
  const [abandoning, setAbandoning] = useState(false)
  const [pendingScores, setPendingScores] = useState(0)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const socketRef = useRef(null)
  // Serializes background API calls so rapid taps stay in order without blocking the UI
  const requestQueueRef = useRef(Promise.resolve())

  const isCreator = match?.createdBy === currentUser?.id

  const currentInning = match?.innings?.find(i => i.inningNumber === match?.currentInning)
  const striker = match?.players?.find(p => p.userId === match?.strikerBatsmanId)
  const nonStriker = match?.players?.find(p => p.userId === match?.nonStrikerBatsmanId)
  const bowler = match?.players?.find(p => p.userId === match?.currentBowlerId)

  const battingTeam = currentInning?.battingTeamId === match?.team1Id ? match?.team1 : match?.team2
  const bowlingTeam = currentInning?.bowlingTeamId === match?.team1Id ? match?.team1 : match?.team2

  const strikerUser = battingTeam?.members?.find(m => m.userId === match?.strikerBatsmanId)
  const nonStrikerUser = battingTeam?.members?.find(m => m.userId === match?.nonStrikerBatsmanId)
  const bowlerUser = bowlingTeam?.members?.find(m => m.userId === match?.currentBowlerId)

  // Current over: only balls belonging to the current over number
  const legalBalls = currentInning?.legalBalls || 0
  const currentOverNum = Math.floor(legalBalls / 6) + 1
  const currentOverBalls = useMemo(
    () => (currentInning?.balls || []).filter(b => b.overNumber === currentOverNum),
    [currentInning?.balls, currentOverNum]
  )
  // 6 slots for legal deliveries, plus one extra slot per wide/no-ball bowled so far
  const currentOverExtraBalls = currentOverBalls.filter(b => b.extraType === 'WIDE' || b.extraType === 'NO_BALL').length
  const currentOverSlots = Math.max(6 + currentOverExtraBalls, currentOverBalls.length)

  const ballsInCurrentOver = legalBalls % 6

  // Bowler who bowled the last ball of the previous over — can't bowl back-to-back
  const prevOverBowlerId = useMemo(() => {
    if (!currentInning || legalBalls === 0 || ballsInCurrentOver !== 0) return null
    const prevOverNum = legalBalls / 6
    const prevOverBalls = (currentInning.balls || []).filter(b => b.overNumber === prevOverNum)
    if (!prevOverBalls.length) return null
    return prevOverBalls[prevOverBalls.length - 1].bowlerId
  }, [currentInning, legalBalls, ballsInCurrentOver])

  const outBatsmanIds = (match?.players || []).filter(p => p.isOut && p.teamId === currentInning?.battingTeamId).map(p => p.userId)
  const activeBatsmenIds = [match?.strikerBatsmanId, match?.nonStrikerBatsmanId].filter(Boolean)

  const inning1 = match?.innings?.find(i => i.inningNumber === 1)
  const target = match?.currentInning === 2 && inning1 ? inning1.totalRuns + 1 : null
  const runsNeeded = target && currentInning ? target - currentInning.totalRuns : null
  const ballsLeft = currentInning ? (match?.totalOvers * 6) - currentInning.legalBalls : null
  const rrr = runsNeeded && ballsLeft ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : null

  const allTeamMembers = useMemo(
    () => [...(match?.team1?.members || []), ...(match?.team2?.members || [])],
    [match?.team1?.members, match?.team2?.members]
  )
  const getMemberName = useCallback(
    (userId) => allTeamMembers.find(m => m.userId === userId)?.user?.fullName || '?',
    [allTeamMembers]
  )

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    )
    if (match?.status === 'IN_PROGRESS') pulse.start()
    else pulse.stop()
    return () => pulse.stop()
  }, [match?.status])

  // Load + socket
  useEffect(() => {
    if (!matchId) return
    getMatch(matchId).then(d => setMatch(d.match)).catch(() => Alert.alert('Error', 'Failed to load match')).finally(() => setLoading(false))

    const token = store.getState().user.token
    const socket = io(API_BASE_URL, { auth: { token }, transports: ['websocket'] })
    socketRef.current = socket
    socket.emit('join_match_room', { matchId })
    socket.on('match_update', updatedMatch => setMatch(prev => mergeMatchUpdate(prev, updatedMatch)))
    return () => { socket.emit('leave_match_room', { matchId }); socket.disconnect() }
  }, [matchId])

  // Runs a request after any already-queued ones finish, keeping server calls in
  // order without making the UI wait for the round trip
  const enqueueRequest = useCallback((fn) => {
    const run = requestQueueRef.current.then(fn, fn)
    requestQueueRef.current = run.then(() => {}, () => {})
    return run
  }, [])

  // Optimistic score update for instant UI feedback — mirrors the backend's
  // strike-rotation / over-completion / innings-completion logic so the UI
  // (striker, non-striker, bowler prompt, score) updates the moment a ball is tapped
  const applyOptimistic = useCallback((payload) => {
    let overCompleted = false
    let inningsOver = false
    setMatch(prev => {
      if (!prev) return prev
      const currentInn = prev.innings.find(i => i.inningNumber === prev.currentInning)
      if (!currentInn) return prev

      const isWide = payload.extraType === 'WIDE'
      const isNoBall = payload.extraType === 'NO_BALL'
      const isLegal = !isWide && !isNoBall
      const extra = (isWide || isNoBall) ? 1 : 0
      const runs = payload.runs || 0
      const totalRunsThisBall = runs + extra
      const newRuns = currentInn.totalRuns + totalRunsThisBall
      const newWickets = currentInn.totalWickets + (payload.isWicket && payload.wicketType !== 'RETIRED_HURT' ? 1 : 0)
      const newLegalBalls = isLegal ? currentInn.legalBalls + 1 : currentInn.legalBalls

      overCompleted = isLegal && newLegalBalls % 6 === 0

      let strikerBatsmanId = prev.strikerBatsmanId
      let nonStrikerBatsmanId = prev.nonStrikerBatsmanId
      let currentBowlerId = prev.currentBowlerId

      if (payload.isWicket) {
        strikerBatsmanId = payload.newBatsmanId || null
      } else {
        let shouldSwap = false
        if (isLegal && runs % 2 === 1) shouldSwap = !shouldSwap
        if (overCompleted) shouldSwap = !shouldSwap
        if (shouldSwap) {
          strikerBatsmanId = prev.nonStrikerBatsmanId
          nonStrikerBatsmanId = prev.strikerBatsmanId
        }
      }
      if (overCompleted) currentBowlerId = null

      const inning1 = prev.innings.find(i => i.inningNumber === 1)
      const maxLegalBalls = (prev.totalOvers || 0) * 6
      const targetReached = prev.currentInning === 2 && inning1 && newRuns > inning1.totalRuns
      inningsOver = newWickets >= 10 || targetReached || (!prev.isTest && isLegal && maxLegalBalls > 0 && newLegalBalls >= maxLegalBalls)

      return {
        ...prev,
        strikerBatsmanId,
        nonStrikerBatsmanId,
        currentBowlerId,
        innings: prev.innings.map(inn =>
          inn.inningNumber === prev.currentInning
            ? { ...inn, totalRuns: newRuns, totalWickets: newWickets, legalBalls: newLegalBalls }
            : inn
        ),
      }
    })
    return { overCompleted, inningsOver }
  }, [])

  const handleScore = useCallback((payload) => {
    if (!isCreator) return
    const { overCompleted, inningsOver } = applyOptimistic(payload)
    if (overCompleted && !inningsOver) {
      setMidOverBowlerChange(false)
      setShowChangeBowler(true)
    }
    setPendingScores(c => c + 1)
    enqueueRequest(() => recordBall(matchId, payload))
      .then(data => {
        setMatch(prev => mergeMatchUpdate(prev, data.match))
        if (data.overCompleted && !data.inningsOver) {
          setMidOverBowlerChange(false)
          setShowChangeBowler(true)
        }
      })
      .catch(err => {
        // Revert optimistic on error
        getMatch(matchId).then(d => setMatch(d.match)).catch(() => {})
        Alert.alert('Error', err?.response?.data?.error || 'Failed to record ball')
      })
      .finally(() => setPendingScores(c => Math.max(0, c - 1)))
  }, [isCreator, matchId, applyOptimistic, enqueueRequest])

  const handleUndo = useCallback(async () => {
    if (submitting || !isCreator) return
    Alert.alert('Undo Last Ball', 'This will reverse the last delivery. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Undo', style: 'destructive', onPress: async () => {
          setSubmitting(true)
          try {
            const data = await undoLastBall(matchId)
            setMatch(prev => mergeMatchUpdate(prev, data.match))
          } catch (err) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to undo')
          } finally {
            setSubmitting(false)
          }
        },
      },
    ])
  }, [submitting, isCreator, matchId])

  const handleAbandon = useCallback((opt) => {
    Alert.alert(
      'End Match',
      opt.winnerTeamId
        ? `Award the win to ${opt.title.replace(' wins', '')}? This cannot be undone.`
        : 'Abandon this match with no result? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', style: 'destructive', onPress: async () => {
            setAbandoning(true)
            try {
              const data = await abandonMatch(matchId, { winnerTeamId: opt.winnerTeamId || null, reason: opt.reason })
              setMatch(prev => mergeMatchUpdate(prev, data.match))
              setShowAbandon(false)
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to end match')
            } finally {
              setAbandoning(false)
            }
          },
        },
      ]
    )
  }, [matchId])

  const handleWicket = useCallback(({ wicketType, newBatsmanId, caughtById }) => {
    setShowWicket(false)
    handleScore({ isWicket: true, wicketType, newBatsmanId, caughtById })
  }, [handleScore])

  const handleChangeBowler = useCallback((member) => {
    setShowChangeBowler(false)
    setSubmitting(true)
    setMatchPlayers(matchId, {
      strikerBatsmanId: match?.strikerBatsmanId,
      nonStrikerBatsmanId: match?.nonStrikerBatsmanId,
      currentBowlerId: member.userId,
      midOverBowlerChange,
    }).then(data => setMatch(data.match))
      .catch(err => {
        const msg = err?.response?.data?.error || 'Failed to change bowler'
        Alert.alert('Cannot Change Bowler', msg)
      })
      .finally(() => {
        setSubmitting(false)
        setMidOverBowlerChange(false)
      })
  }, [matchId, match, midOverBowlerChange])

  const handleBowlerRetirementConfirm = useCallback(() => {
    setShowBowlerRetirement(false)
    setMidOverBowlerChange(true)
    setShowChangeBowler(true)
  }, [])

  const handleRetireBatsman = useCallback(({ wicketType, newBatsmanId }) => {
    setShowChangeBatsman(false)
    handleScore({ isWicket: true, wicketType, newBatsmanId, caughtById: null })
  }, [handleScore])

  const handleDirectBatsmanChange = useCallback((member) => {
    setShowDirectBatsmanChange(false)
    setSubmitting(true)
    setMatchPlayers(matchId, {
      strikerBatsmanId: member.userId,
      nonStrikerBatsmanId: match?.nonStrikerBatsmanId,
      currentBowlerId: match?.currentBowlerId,
    }).then(data => setMatch(data.match))
      .catch(err => {
        const msg = err?.response?.data?.error || 'Failed to change batsman'
        Alert.alert('Cannot Change Batsman', msg)
      })
      .finally(() => setSubmitting(false))
  }, [matchId, match])

  const handleSetPlayers = useCallback(async (payload) => {
    const data = await setMatchPlayers(matchId, payload)
    setMatch(data.match)
  }, [matchId])

  // Swaps striker and non-striker only — does NOT record a ball / change ball count
  const handleSwapStrike = useCallback(() => {
    if (!isCreator || !match) return
    const prevStriker = match.strikerBatsmanId
    const prevNonStriker = match.nonStrikerBatsmanId
    setMatch(prev => prev ? { ...prev, strikerBatsmanId: prev.nonStrikerBatsmanId, nonStrikerBatsmanId: prev.strikerBatsmanId } : prev)
    enqueueRequest(() => setMatchPlayers(matchId, {
      strikerBatsmanId: prevNonStriker,
      nonStrikerBatsmanId: prevStriker,
      currentBowlerId: match.currentBowlerId,
    }))
      .then(data => setMatch(data.match))
      .catch(err => {
        getMatch(matchId).then(d => setMatch(d.match)).catch(() => {})
        Alert.alert('Error', err?.response?.data?.error || 'Failed to swap strike')
      })
  }, [isCreator, match, matchId, enqueueRequest])

  const handleExtraConfirm = useCallback((payload) => {
    handleScore(payload)
  }, [handleScore])

  const topPad = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 8

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
        <ActivityIndicator color={ACCENT} size="large" />
        <Text style={{ color: mutedColor, marginTop: 12, fontFamily: 'Poppins_600SemiBold' }}>Loading match…</Text>
      </View>
    )
  }

  if (!match) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg }}>
        <Text style={{ color: mutedColor }}>Match not found</Text>
      </View>
    )
  }

  const statusColor = match.status === 'IN_PROGRESS' ? GREEN : match.status === 'INNINGS_BREAK' ? '#f59e0b' : '#3b82f6'
  const statusLabel = match.status === 'IN_PROGRESS' ? 'LIVE' : match.status === 'INNINGS_BREAK' ? 'BREAK' : 'ENDED'
  const allPlayers = match.players || []

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[ACCENT, '#a00d24']} style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {match.team1?.name} vs {match.team2?.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Animated.View style={[styles.liveDot, { backgroundColor: statusColor, opacity: match.status === 'IN_PROGRESS' ? pulseAnim : 1 }]} />
            <Text style={[styles.liveLabel, { color: statusColor }]}>{statusLabel}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
              · {match.isTest ? 'Test' : `${match.totalOvers}ov`} · {match.matchFormat} · {match.ballType === 'TENNIS' ? 'Tennis' : match.ballType === 'LEATHER' ? 'Leather' : match.ballType || ''}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={() => setShowScorecard(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="stats-chart-outline" size={22} color="#fff" />
          </TouchableOpacity>
          {isCreator && match.status !== 'COMPLETED' && (
            <TouchableOpacity onPress={() => setShowAbandon(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {match.status === 'INNINGS_BREAK' && (
        <InningsBreakView match={match} onSetPlayers={handleSetPlayers} isDark={isDark} isCreator={isCreator} />
      )}

      {match.status === 'COMPLETED' && <ResultScreen match={match} isDark={isDark} />}

      {match.status === 'IN_PROGRESS' && (
        <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 36 + insets.bottom }} showsVerticalScrollIndicator={false}>

          {/* Scoreboard */}
          <LinearGradient colors={isDark ? ['#1a1a2e', '#16213e'] : ['#1e3a5f', '#2563eb']} style={styles.scoreboard}>
            <View style={styles.scoreboardRow}>
              {[1, 2].map(innNum => {
                const inn = match.innings?.find(i => i.inningNumber === innNum)
                const isActive = innNum === match.currentInning
                const teamName = innNum === 1
                  ? (match.innings[0]?.battingTeamId === match.team1Id ? match.team1?.name : match.team2?.name)
                  : (match.innings[1]?.battingTeamId
                    ? (match.innings[1].battingTeamId === match.team1Id ? match.team1?.name : match.team2?.name)
                    : (match.innings[0]?.bowlingTeamId === match.team1Id ? match.team1?.name : match.team2?.name))
                return (
                  <View key={innNum} style={[styles.scoreboardInning, isActive && styles.scoreboardInningActive]}>
                    <Text style={styles.scoreboardTeamName} numberOfLines={1}>{teamName}</Text>
                    {inn ? (
                      <Text style={styles.scoreboardScore}>
                        {inn.totalRuns}/{inn.totalWickets}
                        <Text style={styles.scoreboardOvers}> ({displayOvers(inn.legalBalls)})</Text>
                      </Text>
                    ) : (
                      <Text style={[styles.scoreboardScore, { fontSize: 15 }]}>Yet to bat</Text>
                    )}
                    {isActive && inn && <Text style={styles.scoreboardRunRate}>CRR: {economy(inn.totalRuns, inn.legalBalls)}</Text>}
                  </View>
                )
              })}
            </View>
            {target && runsNeeded !== null && (
              <View style={styles.targetRow}>
                <Text style={styles.targetRowText}>
                  Need <Text style={{ fontFamily: 'Poppins_800ExtraBold' }}>{runsNeeded}</Text> in{' '}
                  <Text style={{ fontFamily: 'Poppins_800ExtraBold' }}>{ballsLeft}</Text> balls · RRR: {rrr}
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Current over balls */}
          <View style={[styles.lastBallsCard, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={[styles.lastBallsLabel, { color: mutedColor }]}>
                OVER {currentOverNum}  ·  {currentOverBalls.filter(b => b.extraType !== 'WIDE' && b.extraType !== 'NO_BALL').length}/{match.isTest ? '∞' : 6}
              </Text>
              {(currentInning?.balls?.length > 0) && (
                <TouchableOpacity onPress={() => setShowAllOvers(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: ACCENT, fontSize: 11, fontFamily: 'Poppins_700Bold' }}>All Overs →</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.lastBallsRow, { minHeight: 38 }]}>
              {Array.from({ length: currentOverSlots }).map((_, i) => (
                <BallDot key={i} ball={currentOverBalls[i] || null} isDark={isDark} />
              ))}
            </View>
          </View>

          {/* Batsmen */}
          <View style={[styles.battingCard, { backgroundColor: cardBg }]}>
            <View style={styles.battingCardHeader}>
              <Text style={[styles.battingCardTitle, { color: mutedColor }]}>BATTING · {battingTeam?.name}</Text>
              {isCreator && (
                <TouchableOpacity
                  onPress={handleSwapStrike}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.strikeChangeBtn, { color: ACCENT }]}>⇄ Swap Strike</Text>
                </TouchableOpacity>
              )}
            </View>
            {[
              { player: striker, info: strikerUser, isStriker: true },
              { player: nonStriker, info: nonStrikerUser, isStriker: false },
            ].map(({ player, info, isStriker }) => (
              <View key={isStriker ? 'str' : 'nstr'} style={[styles.batsmanRow, isStriker && styles.batsmanRowStriker]}>
                <View style={styles.batsmanAvatarWrap}>
                  <View style={[styles.batsmanAvatar, { backgroundColor: isStriker ? ACCENT : '#e5e5e5' }]}>
                    <Text style={[styles.batsmanAvatarText, !isStriker && { color: '#555' }]}>
                      {initials(info?.user?.fullName || '')}
                    </Text>
                  </View>
                  {isStriker && <View style={styles.strikerStar}><Text style={{ fontSize: 9 }}>★</Text></View>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.batsmanName, { color: textColor }]} numberOfLines={1}>
                    {info?.user?.fullName || (isStriker ? 'Striker' : 'Non-Striker')}
                  </Text>
                  {player ? (
                    <Text style={[styles.batsmanStats, { color: mutedColor }]}>
                      {player.runsScored} ({player.ballsFaced})  SR: {strikeRate(player.runsScored, player.ballsFaced)}
                    </Text>
                  ) : (
                    <Text style={[styles.batsmanStats, { color: mutedColor }]}>0 (0)</Text>
                  )}
                </View>
                {player && (
                  <View style={styles.batsmanBadges}>
                    {player.fours > 0 && <View style={styles.badge4}><Text style={[styles.badgeText, { color: '#1d4ed8' }]}>{player.fours}×4</Text></View>}
                    {player.sixes > 0 && <View style={styles.badge6}><Text style={[styles.badgeText, { color: '#6d28d9' }]}>{player.sixes}×6</Text></View>}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Bowler */}
          <View style={[styles.bowlerCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.battingCardTitle, { color: mutedColor }]}>BOWLING · {bowlingTeam?.name}</Text>
            <View style={styles.bowlerRow}>
              <View style={[styles.batsmanAvatar, { backgroundColor: '#1e40af' }]}>
                <Text style={styles.batsmanAvatarText}>{initials(bowlerUser?.user?.fullName || '')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.batsmanName, { color: textColor }]}>
                  {bowlerUser?.user?.fullName || 'Bowler'}
                </Text>
                {bowler ? (
                  <Text style={[styles.batsmanStats, { color: mutedColor }]}>
                    {displayOvers(bowler.legalBallsBowled)}-{bowler.runsConceded}-{bowler.wicketsTaken}  Eco: {economy(bowler.runsConceded, bowler.legalBallsBowled)}
                  </Text>
                ) : (
                  <Text style={[styles.batsmanStats, { color: mutedColor }]}>0.0-0-0</Text>
                )}
              </View>
            </View>
          </View>

          {/* Scoring controls (creator only) */}
          {isCreator && match?.currentBowlerId ? (
            <View style={[styles.scoringCard, { backgroundColor: cardBg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[styles.battingCardTitle, { color: mutedColor }]}>SCORE</Text>
                {pendingScores > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <ActivityIndicator size="small" color={ACCENT} />
                    <Text style={{ color: mutedColor, fontSize: 10, fontFamily: 'Poppins_500Medium' }}>Saving…</Text>
                  </View>
                )}
              </View>

              {/* Run buttons: row1 = 0,1,2,3  row2 = 4,5,6 */}
              <View style={{ gap: 8 }}>
                <View style={styles.scoreRow}>
                  {[0, 1, 2, 3].map(r => (
                    <RunBtn key={r} runs={r} onPress={() => handleScore({ runs: r })} disabled={pendingScores > 0} />
                  ))}
                </View>
                <View style={[styles.scoreRow, { justifyContent: 'flex-start' }]}>
                  {[4, 5, 6].map(r => (
                    <RunBtn key={r} runs={r} onPress={() => handleScore({ runs: r })} disabled={pendingScores > 0} />
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Extras */}
              <Text style={[styles.battingCardTitle, { color: mutedColor, marginBottom: 4 }]}>EXTRAS</Text>
              <View style={styles.extrasRow}>
                {[
                  { label: 'Wide', short: 'Wd', color: '#d97706', bg: '#fffbeb', extraType: 'WIDE' },
                  { label: 'No Ball', short: 'NB', color: '#c2410c', bg: '#fff7ed', extraType: 'NO_BALL' },
                  { label: 'Leg Bye', short: 'LB', color: '#374151', bg: '#f9fafb', extraType: 'LEG_BYE' },
                  { label: 'Bye', short: 'B', color: '#374151', bg: '#f9fafb', extraType: 'BYE' },
                ].map(({ label, short, color, extraType }) => (
                  <TouchableOpacity
                    key={extraType}
                    style={[styles.extraBtn, { backgroundColor: color }, pendingScores > 0 && { opacity: 0.4 }]}
                    onPress={() => setExtraPickerType(extraType)}
                    disabled={pendingScores > 0}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.extraBtnShort}>{short}</Text>
                    <Text style={styles.extraBtnLabel}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Wicket */}
              <TouchableOpacity
                style={[styles.wicketMainBtn, pendingScores > 0 && { opacity: 0.4 }]}
                onPress={() => setShowWicket(true)}
                disabled={pendingScores > 0}
                activeOpacity={0.8}
              >
                <LinearGradient colors={[ACCENT, '#ff1744']} style={styles.wicketMainBtnGradient}>
                  <Ionicons name="alert-circle" size={18} color="#fff" />
                  <Text style={styles.wicketMainBtnText}>W I C K E T</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Action row */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#2a1a1a' : '#fef2f2', borderColor: ACCENT }]} onPress={handleUndo} disabled={submitting}>
                  <Ionicons name="arrow-undo" size={15} color={ACCENT} />
                  <Text style={[styles.actionBtnText, { color: ACCENT }]}>Undo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: isDark ? '#1a1f2e' : '#eff6ff', borderColor: '#3b82f6' }]}
                  onPress={() => {
                    if ((striker?.ballsFaced || 0) === 0) setShowDirectBatsmanChange(true)
                    else setShowChangeBatsman(true)
                  }}
                  disabled={submitting}
                >
                  <Ionicons name="person-outline" size={15} color="#3b82f6" />
                  <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>Batsman</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: isDark ? '#1e1a2e' : '#f5f3ff', borderColor: '#8b5cf6' }]}
                  onPress={() => {
                    if (ballsInCurrentOver > 0) setShowBowlerRetirement(true)
                    else { setMidOverBowlerChange(false); setShowChangeBowler(true) }
                  }}
                  disabled={submitting}
                >
                  <Ionicons name="swap-horizontal" size={15} color="#8b5cf6" />
                  <Text style={[styles.actionBtnText, { color: '#8b5cf6' }]}>Bowler</Text>
                </TouchableOpacity>
              </View>

              {submitting && (
                <View style={{ alignItems: 'center', paddingTop: 4 }}>
                  <ActivityIndicator color={ACCENT} size="small" />
                </View>
              )}
            </View>
          ) : isCreator && !match?.currentBowlerId ? (
            <TouchableOpacity
              style={[styles.setBowlerPrompt, { backgroundColor: cardBg }]}
              onPress={() => { setMidOverBowlerChange(false); setShowChangeBowler(true) }}
            >
              <Ionicons name="person-add-outline" size={20} color={ACCENT} />
              <Text style={[styles.setBowlerPromptText, { color: ACCENT }]}>Select Bowler to Continue</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.viewerNote, { backgroundColor: cardBg }]}>
              <Ionicons name="eye-outline" size={20} color={mutedColor} />
              <Text style={[styles.viewerNoteText, { color: mutedColor }]}>Live — Updates in real-time</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Scorecard modal */}
      <Modal visible={showScorecard} animationType="fade" statusBarTranslucent onRequestClose={() => setShowScorecard(false)}>
        <View style={{ flex: 1, backgroundColor: bg }}>
          <LinearGradient colors={[ACCENT, '#a00d24']} style={[styles.header, { paddingTop: topPad + 16 }]}>
            <TouchableOpacity onPress={() => setShowScorecard(false)}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scorecard</Text>
            <View style={{ width: 22 }} />
          </LinearGradient>
          {match.status === 'COMPLETED' ? (
            <ResultScreen match={match} isDark={isDark} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {match.innings?.map(inn => (
                <ScorecardBlock key={inn.id} inn={inn} match={match} allPlayers={allPlayers}
                  getMemberName={getMemberName} cardBg={cardBg} textColor={textColor} mutedColor={mutedColor} />
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* All overs modal */}
      <AllOversModal
        visible={showAllOvers}
        currentInning={currentInning}
        onClose={() => setShowAllOvers(false)}
        isDark={isDark}
      />

      {/* Extra picker modal */}
      <ExtraPickerModal
        visible={!!extraPickerType}
        extraType={extraPickerType}
        onConfirm={handleExtraConfirm}
        onClose={() => setExtraPickerType(null)}
        isDark={isDark}
      />

      {/* Wicket modal */}
      <WicketModal
        visible={showWicket}
        battingTeamMembers={battingTeam?.members || []}
        bowlingTeamMembers={bowlingTeam?.members || []}
        outBatsmanIds={outBatsmanIds}
        activeBatsmenIds={activeBatsmenIds}
        onConfirm={handleWicket}
        onClose={() => setShowWicket(false)}
        isDark={isDark}
      />

      {/* Bowler retirement reason (mid-over change) */}
      <BowlerRetirementModal
        visible={showBowlerRetirement}
        playerName={bowlerUser?.user?.fullName}
        onConfirm={handleBowlerRetirementConfirm}
        onClose={() => setShowBowlerRetirement(false)}
        isDark={isDark}
      />

      {/* Change bowler modal */}
      <SelectPlayerModal
        visible={showChangeBowler}
        title={midOverBowlerChange ? 'Replace Bowler (continues this over)' : 'Select Bowler'}
        players={bowlingTeam?.members || []}
        excludeIds={midOverBowlerChange
          ? [match?.currentBowlerId].filter(Boolean)
          : [prevOverBowlerId].filter(Boolean)}
        onSelect={handleChangeBowler}
        onClose={() => { setShowChangeBowler(false); setMidOverBowlerChange(false) }}
        isDark={isDark}
      />

      {/* Change batsman modal — striker has faced balls, ask retired hurt/out */}
      <RetirementModal
        visible={showChangeBatsman}
        playerName={strikerUser?.user?.fullName}
        battingTeamMembers={battingTeam?.members || []}
        outBatsmanIds={outBatsmanIds}
        activeBatsmenIds={activeBatsmenIds}
        onConfirm={handleRetireBatsman}
        onClose={() => setShowChangeBatsman(false)}
        isDark={isDark}
      />

      {/* Direct batsman change — striker hasn't faced a ball yet, swap freely */}
      <SelectPlayerModal
        visible={showDirectBatsmanChange}
        title="Change Batsman"
        players={battingTeam?.members || []}
        excludeIds={[...outBatsmanIds, ...activeBatsmenIds]}
        onSelect={handleDirectBatsmanChange}
        onClose={() => setShowDirectBatsmanChange(false)}
        isDark={isDark}
      />

      {/* Abandon match / walkover */}
      <AbandonMatchModal
        visible={showAbandon}
        team1={match.team1}
        team2={match.team2}
        onConfirm={handleAbandon}
        onClose={() => setShowAbandon(false)}
        isDark={isDark}
        submitting={abandoning}
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveLabel: { fontSize: 11, fontFamily: 'Poppins_700Bold' },

  scoreboard: { borderRadius: 18, padding: 14, gap: 10 },
  scoreboardRow: { flexDirection: 'row', gap: 10 },
  scoreboardInning: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', gap: 2 },
  scoreboardInningActive: { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  scoreboardTeamName: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  scoreboardScore: { color: '#fff', fontSize: 24, fontFamily: 'Poppins_800ExtraBold' },
  scoreboardOvers: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Poppins_400Regular' },
  scoreboardRunRate: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Poppins_400Regular' },
  targetRow: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 8, alignItems: 'center' },
  targetRowText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  lastBallsCard: { borderRadius: 14, padding: 14 },
  lastBallsLabel: { fontSize: 10, fontFamily: 'Poppins_700Bold', letterSpacing: 1 },
  lastBallsRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  ballDot: { justifyContent: 'center', alignItems: 'center' },
  ballDotText: { color: '#fff', fontFamily: 'Poppins_800ExtraBold' },

  battingCard: { borderRadius: 14, padding: 14, gap: 10 },
  battingCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  battingCardTitle: { fontSize: 10, fontFamily: 'Poppins_700Bold', letterSpacing: 1.2 },
  strikeChangeBtn: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  batsmanRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  batsmanRowStriker: { backgroundColor: ACCENT + '12', borderRadius: 10, paddingHorizontal: 8 },
  batsmanAvatarWrap: { position: 'relative' },
  batsmanAvatar: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  batsmanAvatarText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_700Bold' },
  strikerStar: { position: 'absolute', top: -4, right: -4, backgroundColor: '#fbbf24', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  batsmanName: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  batsmanStats: { fontSize: 12, marginTop: 2 },
  batsmanBadges: { flexDirection: 'column', gap: 3, alignItems: 'flex-end' },
  badge4: { backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badge6: { backgroundColor: '#ede9fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: 'Poppins_700Bold' },

  bowlerCard: { borderRadius: 14, padding: 14, gap: 10 },
  bowlerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Scoring card
  scoringCard: { borderRadius: 14, padding: 14, gap: 12 },
  scoreRow: { flexDirection: 'row', gap: 8 },

  runBtn: { flex: 1, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5 },
  runBtnText: { color: '#fff', fontSize: 26, fontFamily: 'Poppins_800ExtraBold' },

  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginVertical: 2 },

  extrasRow: { flexDirection: 'row', gap: 7 },
  extraBtn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 2, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
  extraBtnShort: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_800ExtraBold' },
  extraBtnLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontFamily: 'Poppins_600SemiBold' },

  wicketMainBtn: { borderRadius: 14, overflow: 'hidden', elevation: 5, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  wicketMainBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  wicketMainBtnText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_800ExtraBold', letterSpacing: 4 },

  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, paddingVertical: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontFamily: 'Poppins_700Bold' },

  setBowlerPrompt: { borderRadius: 14, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: ACCENT },
  setBowlerPromptText: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  viewerNote: { borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  viewerNoteText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  // Extra picker
  extraTypeBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  extraRunOption: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  extraRunOptionText: { fontSize: 20, fontFamily: 'Poppins_800ExtraBold' },

  // Over card
  overCard: { borderRadius: 12, padding: 12 },

  // Select sheet
  selectSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', textAlign: 'center', flex: 1 },
  sheetCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  playerSelectRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, gap: 12, elevation: 1 },
  pSelectAvatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: ACCENT + '20', justifyContent: 'center', alignItems: 'center' },
  pSelectAvatarText: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: ACCENT },
  pSelectName: { fontSize: 14, fontFamily: 'Poppins_700Bold', flex: 1 },
  pSelectRole: { fontSize: 11, marginTop: 2 },

  // Wicket
  wicketTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, elevation: 1 },
  wicketTypeBtnText: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#555' },
  confirmWicketBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  confirmWicketBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },

  retireOptionCard: { flex: 1, borderRadius: 14, paddingVertical: 18, alignItems: 'center', gap: 6, elevation: 2 },
  retireOptionLabel: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  retireOptionDesc: { fontSize: 11, fontFamily: 'Poppins_400Regular', textAlign: 'center', paddingHorizontal: 8 },

  // Innings break
  inningsBreakBanner: { borderRadius: 16, padding: 20, alignItems: 'center', gap: 6 },
  inningsBreakTitle: { color: '#fff', fontSize: 22, fontFamily: 'Poppins_800ExtraBold' },
  inningsBreakSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  scoreCard: { borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  scoreCardLabel: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1 },
  scoreCardBig: { fontSize: 36, fontFamily: 'Poppins_800ExtraBold' },
  scoreCardSub: { fontSize: 13 },
  targetBanner: { borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  targetLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 2 },
  targetNum: { color: '#fff', fontSize: 48, fontFamily: 'Poppins_800ExtraBold', lineHeight: 56 },
  targetSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  askTitle: { fontSize: 19, fontFamily: 'Poppins_800ExtraBold' },
  askSub: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', marginTop: -8 },
  startFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16, borderTopWidth: 1 },

  // Result
  winnerBanner: { borderRadius: 16, padding: 24, alignItems: 'center', gap: 6 },
  winnerTrophy: { fontSize: 52 },
  winnerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 2 },
  winnerResult: { color: '#fff', fontSize: 20, fontFamily: 'Poppins_800ExtraBold', textAlign: 'center' },

  // Scorecard
  scorecardBlock: { borderRadius: 14, padding: 14, gap: 4 },
  scorecardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  scorecardTeamName: { flex: 1, fontSize: 15, fontFamily: 'Poppins_700Bold' },
  scorecardScore: { fontSize: 18, fontFamily: 'Poppins_800ExtraBold' },
  scorecardOvers: { fontSize: 12 },
  scorecardTableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', marginBottom: 2 },
  scorecardColHead: { fontSize: 9, fontFamily: 'Poppins_700Bold', letterSpacing: 0.5 },
  scorecardBatterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  scorecardPlayer: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  dismissalText: { fontSize: 11, fontFamily: 'Poppins_400Regular', marginTop: 1 },
  scorecardRunsCell: { width: 32, textAlign: 'center', fontSize: 14, fontFamily: 'Poppins_800ExtraBold' },
  scorecardCell: { width: 32, textAlign: 'center', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  scorecardRCol: { width: 36, textAlign: 'center' },
  scorecardWideCol: { width: 52, textAlign: 'center' },
  yetToBatRow: { paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },

  // Awards
  awardCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 12 },
  awardEmoji: { fontSize: 32 },
  awardLabel: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1 },
  awardName: { fontSize: 15, fontFamily: 'Poppins_700Bold', marginTop: 2 },
  awardDetail: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', marginTop: 2 },

  sectionLabel: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1.2 },
  nextBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextBtnDisabled: { backgroundColor: '#ccc' },
  nextBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
})
