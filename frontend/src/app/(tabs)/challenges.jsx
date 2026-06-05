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

export default function ChallengesScreen() {
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()

  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'
  const hintColor = isDark ? '#555' : '#bbb'

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: textColor }]}>Challenges</Text>
      <Text style={[styles.sub, { color: mutedColor }]}>Issue or accept real-world battles</Text>

      <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-match')}>
        <LinearGradient colors={[ACCENT, '#A00D26']} style={styles.createGradient}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Create a Challenge</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.joinBtn, { backgroundColor: cardBg, borderColor: ACCENT }]} onPress={() => router.push('/join-match')}>
        <Ionicons name="enter-outline" size={20} color={ACCENT} />
        <Text style={[styles.joinBtnText, { color: ACCENT }]}>Join a Match</Text>
      </TouchableOpacity>

      <View style={[styles.emptyBox, { backgroundColor: cardBg }]}>
        <Ionicons name="trophy-outline" size={48} color="#ccc" />
        <Text style={[styles.emptyText, { color: mutedColor }]}>No challenges yet</Text>
        <Text style={[styles.emptyHint, { color: hintColor }]}>Create or join challenges to compete with players near you</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  sub: { fontSize: 14, marginBottom: 20 },
  createBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  createGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  createBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold', lineHeight: 20 },
  joinBtn: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 2, marginBottom: 28 },
  joinBtnText: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
  emptyBox: { borderRadius: 16, padding: 40, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  emptyText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginTop: 14 },
  emptyHint: { fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 18 },
})
