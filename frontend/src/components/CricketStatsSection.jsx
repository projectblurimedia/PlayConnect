import React, { useRef, useState, useCallback } from 'react'
import { View, Text as RNText, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

const ACCENT = '#C8102E'
const PAGE_WIDTH = Dimensions.get('window').width

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

const FORMAT_META = {
  T20: { label: 'T20', emoji: '⚡' },
  T10: { label: 'T10', emoji: '🔥' },
  ODI: { label: 'ODI', emoji: '🏏' },
  TEST: { label: 'Test', emoji: '🎩' },
  CUSTOM: { label: 'Custom', emoji: '✏️' },
}

const BALL_TYPE_META = {
  LEATHER: { label: 'Leather Ball' },
  TENNIS: { label: 'Tennis Ball' },
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline' },
  { key: 'format', label: 'Format', icon: 'layers-outline' },
  { key: 'batting', label: 'Batting', icon: 'baseball-outline' },
  { key: 'bowling', label: 'Bowling', icon: 'disc-outline' },
]

export function strikeRate(runs, balls) {
  if (!balls) return '0.00'
  return ((runs / balls) * 100).toFixed(2)
}

export function economy(runsConceded, ballsBowled) {
  if (!ballsBowled) return '0.00'
  return (runsConceded / (ballsBowled / 6)).toFixed(2)
}

export function displayOvers(legalBalls) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`
}

function FormatStatItem({ label, value, textColor, mutedColor }) {
  return (
    <View style={styles.formatMiniItem}>
      <Text style={[styles.formatMiniValue, { color: textColor }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.formatMiniLabel, { color: mutedColor }]} numberOfLines={1}>{label}</Text>
    </View>
  )
}

function StatTile({ label, value, icon, color, textColor, mutedColor, cardBg }) {
  return (
    <View style={[styles.statTile, { backgroundColor: cardBg }]}>
      {icon && (
        <View style={[styles.statTileIconWrap, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
      )}
      <Text style={[styles.statTileValue, { color: textColor }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statTileLabel, { color: mutedColor }]} numberOfLines={1}>{label}</Text>
    </View>
  )
}

function EmptyTab({ icon, title, hint, textColor, mutedColor }) {
  return (
    <View style={styles.emptyTab}>
      <View style={styles.emptyTabIconBg}>
        <Ionicons name={icon} size={28} color={ACCENT} />
      </View>
      <Text style={[styles.emptyTabTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.emptyTabHint, { color: mutedColor }]}>{hint}</Text>
    </View>
  )
}

// Renders the cricket career-stats block as a header-stats summary plus a
// tappable / horizontally-swipeable Overview · Format · Batting · Bowling
// pager — shared between the own-profile tab and other players' profile pages.
export default function CricketStatsSection({ cricket, loading, isDark, extraChips = [] }) {
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const tileBg = isDark ? '#262626' : '#f7f7f7'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'

  const scrollRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [pageHeights, setPageHeights] = useState({})

  const cStats = cricket?.stats || {}
  const matchesPlayed = cricket?.matchesPlayed || 0
  const matchesWon = cricket?.matchesWon || 0
  const winPct = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0
  const hasBatted = (cStats.balls || 0) > 0
  const hasBowled = (cStats.ballsBowled || 0) > 0
  const hasFormats = !!(cStats.formats && Object.keys(cStats.formats).length > 0)

  const handleTabPress = useCallback((index) => {
    setActiveIndex(index)
    scrollRef.current?.scrollTo({ x: index * PAGE_WIDTH, animated: true })
  }, [])

  const handleMomentumEnd = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / PAGE_WIDTH)
    setActiveIndex(index)
  }, [])

  const handlePageLayout = useCallback((index, e) => {
    const h = e.nativeEvent.layout.height
    setPageHeights(prev => (prev[index] === h ? prev : { ...prev, [index]: h }))
  }, [])

  if (!loading && !cricket) return null

  const overviewTiles = [
    { label: 'Matches', value: loading ? '…' : String(matchesPlayed), icon: 'football-outline', color: '#3b82f6' },
    { label: 'Wins', value: loading ? '…' : String(matchesWon), icon: 'trophy-outline', color: '#f59e0b' },
    { label: 'Win %', value: loading ? '…' : `${winPct}%`, icon: 'trending-up-outline', color: '#22c55e' },
    !loading && hasBatted && { label: 'Runs', value: String(cStats.runs || 0), icon: 'stats-chart-outline', color: '#8b5cf6' },
    !loading && hasBatted && { label: 'Strike Rate', value: strikeRate(cStats.runs, cStats.balls), icon: 'flash-outline', color: '#ec4899' },
    !loading && hasBowled && { label: 'Wickets', value: String(cStats.wickets || 0), icon: 'flag-outline', color: '#0891b2' },
    ...extraChips,
  ].filter(Boolean)

  return (
    <View>
      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: isDark ? '#2a2a2a' : '#eee' }]}>
        {TABS.map((tab, i) => {
          const active = activeIndex === i
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, active && { borderBottomColor: ACCENT }]}
              onPress={() => handleTabPress(i)}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon} size={14} color={active ? ACCENT : mutedColor} />
              <Text style={[styles.tabBtnText, { color: active ? ACCENT : mutedColor }, active && { fontFamily: 'Poppins_700Bold' }]}>{tab.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Swipeable pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        style={{ height: pageHeights[activeIndex] }}
      >
        {/* Overview */}
        <View style={{ width: PAGE_WIDTH, paddingHorizontal: 14 }} onLayout={(e) => handlePageLayout(0, e)}>
          <View style={styles.statGridWrap}>
            {overviewTiles.map(t => (
              <StatTile key={t.label} {...t} textColor={textColor} mutedColor={mutedColor} cardBg={cardBg} />
            ))}
          </View>
          {!loading && cricket && matchesPlayed > 0 && !hasBatted && !hasBowled && (
            <Text style={[styles.overviewHint, { color: mutedColor }]}>
              Stats will appear once they bat or bowl in a match
            </Text>
          )}
        </View>

        {/* Format-wise stats */}
        <View style={{ width: PAGE_WIDTH, paddingHorizontal: 14 }} onLayout={(e) => handlePageLayout(1, e)}>
          {!loading && hasFormats ? (
            Object.entries(cStats.formats).map(([key, fStats]) => {
              const [fmt, ball] = key.split('_')
              const fMatches = fStats.matchesPlayed || 0
              const fWins = fStats.matchesWon || 0
              const fWinPct = fMatches > 0 ? Math.round((fWins / fMatches) * 100) : 0
              const fBatted = (fStats.balls || 0) > 0
              const fBowled = (fStats.ballsBowled || 0) > 0

              return (
                <View key={key} style={[styles.formatCard, { backgroundColor: cardBg }]}>
                  <View style={styles.formatCardHeader}>
                    <View style={styles.formatEmojiWrap}>
                      <Text style={styles.formatEmoji}>{FORMAT_META[fmt]?.emoji || '🏏'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formatTitle, { color: textColor }]} numberOfLines={1}>{FORMAT_META[fmt]?.label || fmt}</Text>
                      <Text style={[styles.formatSub, { color: mutedColor }]} numberOfLines={1}>{BALL_TYPE_META[ball]?.label || ball}</Text>
                    </View>
                    <View style={styles.formatRecordPill}>
                      <Text style={styles.formatRecordPillText}>{fMatches} M · {fWins} W · {fWinPct}%</Text>
                    </View>
                  </View>

                  {fBatted && (
                    <View style={[styles.formatStatRow, { borderTopColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                      <FormatStatItem label="Runs" value={fStats.runs || 0} textColor={textColor} mutedColor={mutedColor} />
                      <FormatStatItem label="SR" value={strikeRate(fStats.runs, fStats.balls)} textColor={textColor} mutedColor={mutedColor} />
                      <FormatStatItem label="HS" value={fStats.highScore || 0} textColor={textColor} mutedColor={mutedColor} />
                    </View>
                  )}

                  {fBowled && (
                    <View style={[styles.formatStatRow, { borderTopColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                      <FormatStatItem label="Wkts" value={fStats.wickets || 0} textColor={textColor} mutedColor={mutedColor} />
                      <FormatStatItem label="Econ" value={economy(fStats.runsConceded, fStats.ballsBowled)} textColor={textColor} mutedColor={mutedColor} />
                      <FormatStatItem
                        label="Best"
                        value={fStats.bestBowling ? `${fStats.bestBowling.wickets}/${fStats.bestBowling.runs}` : '—'}
                        textColor={textColor} mutedColor={mutedColor}
                      />
                    </View>
                  )}
                </View>
              )
            })
          ) : (
            <EmptyTab
              icon="layers-outline"
              title="No format-wise stats yet"
              hint="Play matches in different formats to see a breakdown here"
              textColor={textColor} mutedColor={mutedColor}
            />
          )}
        </View>

        {/* Batting */}
        <View style={{ width: PAGE_WIDTH, paddingHorizontal: 14 }} onLayout={(e) => handlePageLayout(2, e)}>
          {!loading && hasBatted ? (
            <View style={[styles.statSectionCard, { backgroundColor: cardBg }]}>
              <LinearGradient colors={['#1e40af', '#3b82f6']} style={styles.statSectionHeader}>
                <View style={styles.statSectionHeaderLeft}>
                  <Text style={styles.statSectionEmoji}>🏏</Text>
                  <Text style={styles.statSectionTitle}>BATTING</Text>
                </View>
                <Text style={styles.statSectionHeaderSub}>{matchesPlayed} matches</Text>
              </LinearGradient>
              <View style={styles.statGrid}>
                {[
                  { label: 'Runs', value: cStats.runs || 0 },
                  { label: 'Highest', value: cStats.highScore || 0 },
                  { label: 'Strike Rate', value: strikeRate(cStats.runs, cStats.balls) },
                  { label: 'Fours', value: cStats.fours || 0 },
                  { label: 'Sixes', value: cStats.sixes || 0 },
                  { label: '50s / 100s', value: `${cStats.fifties || 0} / ${cStats.hundreds || 0}` },
                ].map(t => (
                  <View key={t.label} style={[styles.statTileBig, { backgroundColor: tileBg }]}>
                    <Text style={[styles.statTileBigValue, { color: textColor }]}>{t.value}</Text>
                    <Text style={[styles.statTileBigLabel, { color: mutedColor }]}>{t.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <EmptyTab
              icon="baseball-outline"
              title="No batting stats yet"
              hint="Stats will appear once they bat in a match"
              textColor={textColor} mutedColor={mutedColor}
            />
          )}
        </View>

        {/* Bowling */}
        <View style={{ width: PAGE_WIDTH, paddingHorizontal: 14 }} onLayout={(e) => handlePageLayout(3, e)}>
          {!loading && hasBowled ? (
            <View style={[styles.statSectionCard, { backgroundColor: cardBg }]}>
              <LinearGradient colors={['#15803d', '#22c55e']} style={styles.statSectionHeader}>
                <View style={styles.statSectionHeaderLeft}>
                  <Text style={styles.statSectionEmoji}>🎯</Text>
                  <Text style={styles.statSectionTitle}>BOWLING</Text>
                </View>
                <Text style={styles.statSectionHeaderSub}>{matchesPlayed} matches</Text>
              </LinearGradient>
              <View style={styles.statGrid}>
                {[
                  { label: 'Wickets', value: cStats.wickets || 0 },
                  { label: 'Overs', value: displayOvers(cStats.ballsBowled || 0) },
                  { label: 'Economy', value: economy(cStats.runsConceded, cStats.ballsBowled) },
                  { label: 'Runs Given', value: cStats.runsConceded || 0 },
                  {
                    label: 'Best',
                    value: cStats.bestBowling ? `${cStats.bestBowling.wickets}/${cStats.bestBowling.runs}` : '—',
                  },
                ].map(t => (
                  <View key={t.label} style={[styles.statTileBig, { backgroundColor: tileBg }]}>
                    <Text style={[styles.statTileBigValue, { color: textColor }]}>{t.value}</Text>
                    <Text style={[styles.statTileBigLabel, { color: mutedColor }]}>{t.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <EmptyTab
              icon="disc-outline"
              title="No bowling stats yet"
              hint="Stats will appear once they bowl in a match"
              textColor={textColor} mutedColor={mutedColor}
            />
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginTop: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBtnText: { fontSize: 11.5, fontFamily: 'Poppins_600SemiBold' },

  // ── Overview grid ──
  statGridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 16 },
  statTile: {
    width: '31%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  statTileIconWrap: {
    width: 30, height: 30, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  statTileValue: { fontSize: 15, fontFamily: 'Poppins_700Bold', marginBottom: 2 },
  statTileLabel: { fontSize: 9.5, textAlign: 'center' },
  overviewHint: { fontSize: 12, textAlign: 'center', lineHeight: 18, paddingBottom: 16 },

  // ── Empty tab ──
  emptyTab: { alignItems: 'center', paddingVertical: 28, paddingBottom: 40 },
  emptyTabIconBg: {
    width: 54, height: 54, borderRadius: 15,
    backgroundColor: ACCENT + '12',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  emptyTabTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', marginBottom: 4 },
  emptyTabHint: { fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 24 },

  // ── Batting / Bowling stat cards ──
  statSectionCard: {
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  statSectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statSectionEmoji: { fontSize: 16 },
  statSectionTitle: { fontSize: 12.5, fontFamily: 'Poppins_700Bold', color: '#fff', letterSpacing: 1 },
  statSectionHeaderSub: { fontSize: 10.5, fontFamily: 'Poppins_600SemiBold', color: 'rgba(255,255,255,0.85)' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  statTileBig: {
    width: '31%', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center',
  },
  statTileBigValue: { fontSize: 15, fontFamily: 'Poppins_700Bold', marginBottom: 2 },
  statTileBigLabel: { fontSize: 10, textAlign: 'center' },

  // ── Format-wise stats ──
  formatCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  formatCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  formatEmojiWrap: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: ACCENT + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  formatEmoji: { fontSize: 18 },
  formatTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  formatSub: { fontSize: 11 },
  formatRecordPill: {
    backgroundColor: ACCENT + '12',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  formatRecordPillText: { fontSize: 11, fontFamily: 'Poppins_700Bold', color: ACCENT },
  formatStatRow: {
    flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, marginTop: 8,
  },
  formatMiniItem: { flex: 1, alignItems: 'center' },
  formatMiniValue: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  formatMiniLabel: { fontSize: 9.5, marginTop: 1 },
})
