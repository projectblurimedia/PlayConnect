import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { createTeam } from '../services/api'

const ACCENT = '#C8102E'
const poppins = { fontFamily: 'Poppins_400Regular' }

const CRICKET_INFO = [
  { icon: 'people-outline', text: 'Up to 11 players per side' },
  { icon: 'star-outline', text: 'Assign Captain & Vice Captain' },
  { icon: 'shield-checkmark-outline', text: 'Wicket Keeper role assignment' },
  { icon: 'person-remove-outline', text: 'Admin can remove any player' },
  { icon: 'qr-code-outline', text: 'Share invite code to add players' },
]

function CodeDisplay({ code, onShare }) {
  return (
    <View style={styles.codeCard}>
      <Ionicons name="checkmark-circle" size={48} color="#22c55e" style={{ marginBottom: 12 }} />
      <Text style={[poppins, styles.successTitle]}>Team Created!</Text>
      <Text style={[poppins, styles.codeLabel]}>Your Invite Code</Text>
      <View style={styles.codeBox}>
        {code.split('').map((ch, i) => (
          <View key={i} style={styles.codeLetter}>
            <Text style={[poppins, styles.codeChar]}>{ch}</Text>
          </View>
        ))}
      </View>
      <Text style={[poppins, styles.codeHint]}>Share this code with players to invite them</Text>
      <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
        <Ionicons name="share-social-outline" size={18} color="#fff" />
        <Text style={[poppins, styles.shareBtnText]}>Share Invite Code</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function CreateTeamScreen() {
  const router = useRouter()
  const theme = useSelector(s => s.user.theme)
  const isDark = theme === 'dark'

  const bg = isDark ? '#111' : '#f7f7f7'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#888'
  const inputBg = isDark ? '#2a2a2a' : '#f5f5f5'
  const inputBorder = isDark ? '#333' : '#e5e5e5'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('11')
  const [loading, setLoading] = useState(false)
  const [createdCode, setCreatedCode] = useState(null)
  const [createdTeamId, setCreatedTeamId] = useState(null)

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a team name')
      return
    }
    const max = parseInt(maxPlayers, 10)
    if (isNaN(max) || max < 2 || max > 15) {
      Alert.alert('Error', 'Max players must be between 2 and 15')
      return
    }

    setLoading(true)
    try {
      const data = await createTeam({
        name: name.trim(),
        description: description.trim() || undefined,
        sport: 'CRICKET',
        maxPlayers: max,
      })
      setCreatedCode(data.team.inviteCode)
      setCreatedTeamId(data.team.id)
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my cricket team on PlayConnect!\nInvite Code: ${createdCode}\nOpen PlayConnect → Join Team → Enter code: ${createdCode}`,
        title: 'Join my PlayConnect team',
      })
    } catch {}
  }

  const goToTeam = () => {
    if (createdTeamId) router.replace(`/team/${createdTeamId}`)
    else router.replace('/teams')
  }

  if (createdCode) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[poppins, styles.headerTitle, { color: textColor }]}>Create Team</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.successScroll}>
          <CodeDisplay code={createdCode} onShare={handleShare} />
          <TouchableOpacity style={styles.viewTeamBtn} onPress={goToTeam}>
            <Text style={[poppins, styles.viewTeamBtnText]}>View Team</Text>
            <Ionicons name="arrow-forward" size={18} color={ACCENT} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[poppins, styles.headerTitle, { color: textColor }]}>Create Cricket Team</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Cricket rules info */}
        <View style={[styles.infoCard, { backgroundColor: ACCENT + '10' }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="baseball-outline" size={20} color={ACCENT} />
            <Text style={[poppins, styles.infoTitle, { color: ACCENT }]}>Cricket Team Rules</Text>
          </View>
          {CRICKET_INFO.map((item, i) => (
            <View key={i} style={styles.infoRow}>
              <Ionicons name={item.icon} size={16} color={ACCENT} />
              <Text style={[poppins, styles.infoText, { color: textColor }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Form */}
        <View style={[styles.formCard, { backgroundColor: cardBg }]}>
          <Text style={[poppins, styles.label, { color: textColor }]}>Team Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            placeholder="e.g. Chennai Super Kings"
            placeholderTextColor={mutedColor}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <Text style={[poppins, styles.label, { color: textColor }]}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            placeholder="About your team..."
            placeholderTextColor={mutedColor}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />

          <Text style={[poppins, styles.label, { color: textColor }]}>Max Players (2–15)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            placeholder="11"
            placeholderTextColor={mutedColor}
            value={maxPlayers}
            onChangeText={setMaxPlayers}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={[poppins, styles.hint, { color: mutedColor }]}>Standard cricket = 11 players</Text>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, loading && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="people" size={20} color="#fff" />
                <Text style={[poppins, styles.createBtnText]}>Create Team</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  infoCard: { borderRadius: 14, padding: 16, gap: 10 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  infoTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 13 },
  formCard: { borderRadius: 14, padding: 16, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: 'Poppins_400Regular' },
  textArea: { height: 80, textAlignVertical: 'top' },
  hint: { fontSize: 11, marginTop: 4 },
  createBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  // success
  successScroll: { padding: 24, alignItems: 'center', gap: 16 },
  codeCard: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },
  successTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#111', marginBottom: 20 },
  codeLabel: { fontSize: 13, color: '#888', marginBottom: 12, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1 },
  codeBox: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  codeLetter: { width: 44, height: 52, backgroundColor: ACCENT + '15', borderRadius: 10, borderWidth: 1.5, borderColor: ACCENT + '40', justifyContent: 'center', alignItems: 'center' },
  codeChar: { fontSize: 22, fontFamily: 'Poppins_800ExtraBold', color: ACCENT },
  codeHint: { fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 20 },
  shareBtn: { backgroundColor: ACCENT, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  shareBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  viewTeamBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  viewTeamBtnText: { color: ACCENT, fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
})
