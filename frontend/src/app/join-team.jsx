import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { joinTeam } from '../services/api'

const ACCENT = '#C8102E'
const poppins = { fontFamily: 'Poppins_400Regular' }

export default function JoinTeamScreen() {
  const router = useRouter()
  const theme = useSelector(s => s.user.theme)
  const isDark = theme === 'dark'

  const bg = isDark ? '#111' : '#f7f7f7'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#888'
  const inputBg = isDark ? '#2a2a2a' : '#f5f5f5'
  const inputBorder = isDark ? '#333' : '#e5e5e5'

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(null)

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-character invite code')
      return
    }

    setLoading(true)
    try {
      const data = await joinTeam(trimmed)
      setJoined(data.team)
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to join team')
    } finally {
      setLoading(false)
    }
  }

  if (joined) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[poppins, styles.headerTitle, { color: textColor }]}>Join Team</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={72} color="#22c55e" />
          <Text style={[poppins, styles.successTitle, { color: textColor }]}>Joined Successfully!</Text>
          <Text style={[poppins, styles.successTeamName, { color: ACCENT }]}>{joined.name}</Text>
          <Text style={[poppins, styles.successSport, { color: mutedColor }]}>{joined.sport}</Text>
          <TouchableOpacity style={styles.viewBtn} onPress={() => router.replace('/teams')}>
            <Text style={[poppins, styles.viewBtnText]}>View My Teams</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[poppins, styles.headerTitle, { color: textColor }]}>Join Team</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.iconWrap}>
            <Ionicons name="qr-code" size={40} color={ACCENT} />
          </View>
          <Text style={[poppins, styles.cardTitle, { color: textColor }]}>Enter Invite Code</Text>
          <Text style={[poppins, styles.cardSub, { color: mutedColor }]}>
            Ask your team admin for the 6-character invite code
          </Text>

          <TextInput
            style={[styles.codeInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            placeholder="e.g. A1B2C3"
            placeholderTextColor={mutedColor}
            value={code}
            onChangeText={t => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.joinBtn, loading && styles.joinBtnDisabled]}
            onPress={handleJoin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="enter-outline" size={20} color="#fff" />
                  <Text style={[poppins, styles.joinBtnText]}>Join Team</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        <Text style={[poppins, styles.orText, { color: mutedColor }]}>Don't have a code?</Text>
        <TouchableOpacity onPress={() => router.replace('/create-team')}>
          <Text style={[poppins, styles.createLink]}>Create your own team →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    gap: 12,
  },
  iconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: ACCENT + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', textAlign: 'center' },
  cardSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  codeInput: {
    width: '100%',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 24,
    fontFamily: 'Poppins_800ExtraBold',
    textAlign: 'center',
    letterSpacing: 8,
    marginTop: 8,
  },
  joinBtn: {
    width: '100%',
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  joinBtnDisabled: { opacity: 0.6 },
  joinBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  orText: { fontSize: 13, marginTop: 8 },
  createLink: { color: ACCENT, fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  // success
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  successTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', marginTop: 8 },
  successTeamName: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  successSport: { fontSize: 13 },
  viewBtn: { backgroundColor: ACCENT, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12, marginTop: 16 },
  viewBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 15 },
})
