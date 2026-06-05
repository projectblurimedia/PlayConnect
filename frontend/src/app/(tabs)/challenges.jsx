import React from 'react'
import { View, Text as RNText, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSelector } from 'react-redux'
import { useRouter } from 'expo-router'

const ACCENT = '#C8102E'

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

const STATS = [
  { icon: 'trophy-outline', label: 'Total Challenges', value: '0', color: '#f59e0b' },
  { icon: 'checkmark-circle-outline', label: 'Wins', value: '0', color: '#22c55e' },
  { icon: 'close-circle-outline', label: 'Losses', value: '0', color: ACCENT },
]

export default function ChallengesScreen() {
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()

  const bg = isDark ? '#111' : '#efefef'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Page heading */}
      <View style={[styles.headCard, { backgroundColor: cardBg }]}>
        <Text style={[styles.pageTitle, { color: textColor }]}>
          Your <Text style={styles.pageTitleAccent}>Challenges</Text>
        </Text>
        <Text style={[styles.pageSub, { color: mutedColor }]}>
          Issue or accept real-world sport battles
        </Text>
      </View>

      {/* Stats row */}
      <Text style={styles.sectionLabel}>YOUR STATS</Text>
      <View style={styles.statsRow}>
        {STATS.map(s => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: cardBg }]}>
            <View style={[styles.statIconBg, { backgroundColor: s.color + '18' }]}>
              <Ionicons name={s.icon} size={20} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: textColor }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: mutedColor }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Battle Mode actions */}
      <Text style={styles.sectionLabel}>BATTLE MODE</Text>

      <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-match')}>
        <LinearGradient colors={[ACCENT, '#A00D26']} style={styles.createGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <View style={styles.btnIconBg}>
            <Ionicons name="add-circle" size={22} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.createBtnTitle}>Create a Challenge</Text>
            <Text style={styles.createBtnSub}>Set your sport, venue & rules</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.joinBtn, { backgroundColor: cardBg, borderColor: ACCENT + '50' }]}
        onPress={() => router.push('/join-match')}
      >
        <View style={[styles.joinIconBg]}>
          <Ionicons name="enter-outline" size={22} color={ACCENT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.joinBtnTitle, { color: textColor }]}>Join a Match</Text>
          <Text style={[styles.joinBtnSub, { color: mutedColor }]}>Enter a match code or browse open ones</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={ACCENT} />
      </TouchableOpacity>

      {/* Empty state */}
      <Text style={styles.sectionLabel}>ACTIVE CHALLENGES</Text>
      <View style={[styles.emptyBox, { backgroundColor: cardBg }]}>
        <View style={styles.emptyIconBg}>
          <Ionicons name="trophy-outline" size={32} color={ACCENT} />
        </View>
        <Text style={[styles.emptyTitle, { color: textColor }]}>No challenges yet</Text>
        <Text style={[styles.emptyHint, { color: mutedColor }]}>
          Create or join challenges to compete with players near you
        </Text>
        <View style={styles.featureList}>
          {[
            { icon: 'location-outline', text: 'Play at real venues' },
            { icon: 'people-outline', text: 'Challenge nearby players' },
            { icon: 'medal-outline', text: 'Track your wins & losses' },
          ].map(f => (
            <View key={f.text} style={[styles.featureRow, { borderBottomColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon} size={16} color={ACCENT} />
              </View>
              <Text style={[styles.featureText, { color: mutedColor }]}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },

  // ── Heading card ──
  headCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  pageTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', marginBottom: 4, lineHeight: 28 },
  pageTitleAccent: { color: ACCENT, fontFamily: 'Poppins_800ExtraBold' },
  pageSub: { fontSize: 12.5, lineHeight: 18 },

  // ── Section label ──
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: ACCENT,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // ── Stats ──
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBg: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  statValue: { fontSize: 18, fontFamily: 'Poppins_700Bold', marginBottom: 2 },
  statLabel: { fontSize: 9, textAlign: 'center', fontFamily: 'Poppins_400Regular' },

  // ── Create button ──
  createBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  btnIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  createBtnTitle: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_700Bold', lineHeight: 20 },
  createBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'Poppins_400Regular' },

  // ── Join button ──
  joinBtn: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 22,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  joinIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: ACCENT + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  joinBtnTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold', lineHeight: 20, marginBottom: 2 },
  joinBtnSub: { fontSize: 11, fontFamily: 'Poppins_400Regular' },

  // ── Empty state ──
  emptyBox: {
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconBg: {
    width: 58, height: 58, borderRadius: 16,
    backgroundColor: ACCENT + '12',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, alignSelf: 'center',
  },
  emptyTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', textAlign: 'center', marginBottom: 6 },
  emptyHint: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 18 },
  featureList: { gap: 0 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, gap: 10,
  },
  featureIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: ACCENT + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  featureText: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
})
