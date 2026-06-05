import React from 'react'
import { View, Text as RNText, ScrollView, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'

const ACCENT = '#C8102E'
function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

export default function JoinMatchScreen() {
  const router = useRouter()
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#666'

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar backgroundColor={ACCENT} barStyle="light-content" />
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Match</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Ionicons name="enter-outline" size={48} color="#ccc" />
          <Text style={[styles.title, { color: textColor }]}>Coming Soon</Text>
          <Text style={[styles.sub, { color: mutedColor }]}>Browse open matches near you and join instantly. Find your next game!</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { backgroundColor: ACCENT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 14 },
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_600SemiBold' },
  content: { padding: 20 },
  card: { borderRadius: 16, padding: 36, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  title: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginTop: 16, marginBottom: 10 },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
})
