import React, { useState } from 'react'
import {
  View,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useDispatch } from 'react-redux'
import { setUser } from '../store/userSlice'
import { loginUser } from '../services/api'

const poppins = { fontFamily: 'Poppins_400Regular' }
const ACCENT = '#C8102E'

function Text({ style, ...props }) {
  return <RNText {...props} style={[poppins, style]} />
}

function TextInput({ style, ...props }) {
  return <RNTextInput {...props} style={[poppins, style]} />
}

export default function LoginScreen() {
  const router = useRouter()
  const dispatch = useDispatch()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Error', 'Please enter your phone/username and password')
      return
    }
    setLoading(true)
    try {
      const result = await loginUser({ identifier: identifier.trim(), password })
      if (result.success) {
        dispatch(setUser({ user: result.user, token: result.token }))
        router.replace('/home')
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials')
      }
    } catch {
      Alert.alert('Connection Error', 'Could not connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ACCENT} />

      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <Text style={styles.appName}>PLAY<Text style={styles.appNameAccent}>CONNECT</Text></Text>
          <Text style={styles.tagline}>Stop Virtual Games. Start Real Battles.</Text>
          <View style={styles.headerIconsRow}>
            {['🏏', '⚽', '🏀', '🏸', '🏐', '🎾', '🏊', '🚴', '🏃', '🏑', '🏓', '🤼'].map((icon, i) => (
              <RNText key={i} style={styles.headerIcon}>{icon}</RNText>
            ))}
          </View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.loginCard}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtitle}>Login with phone number or username</Text>
            </View>

            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="person-outline" size={20} color="#888" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Phone number or username"
                  placeholderTextColor="#999"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={20} color="#888" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(p => !p)}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={22} color="#888" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
                <LinearGradient colors={[ACCENT, '#A00D26']} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Text style={styles.loginButtonText}>Login</Text>
                        <Ionicons name="arrow-forward-outline" size={20} color="#fff" />
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.featuresSection}>
              {[
                { icon: 'shield-checkmark-outline', label: 'Secure Login' },
                { icon: 'flash-outline', label: 'Quick Access' },
                { icon: 'people-outline', label: 'Join Players' },
                { icon: 'trophy-outline', label: 'Play. Connect. Win.' },
              ].map((f) => (
                <View key={f.label} style={styles.featureItem}>
                  <View style={styles.featureIconBg}>
                    <Ionicons name={f.icon} size={18} color={ACCENT} />
                  </View>
                  <Text style={styles.featureText}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.signUpSection}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/register')}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContainer: { flexGrow: 1, paddingBottom: 40 },
  headerBackground: {
    backgroundColor: ACCENT,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
  },
  headerContent: { alignItems: 'center', paddingHorizontal: 16 },
  appName: { fontSize: 24, fontFamily: 'Poppins_800ExtraBold', color: '#fff', letterSpacing: -0.5 },
  appNameAccent: { opacity: 0.85 },
  tagline: { fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 },
  headerIconsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10, opacity: 0.75 },
  headerIcon: { fontSize: 20 },
  loginCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeSection: { alignItems: 'center', marginBottom: 32 },
  welcomeTitle: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#1a1a1a' },
  welcomeSubtitle: { fontSize: 13, color: '#666', marginTop: 6, textAlign: 'center' },
  formSection: { marginBottom: 20 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputIcon: { paddingLeft: 16 },
  input: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, fontSize: 16, color: '#333', fontFamily: 'Poppins_400Regular' },
  eyeIcon: { paddingRight: 18 },
  loginButton: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  gradient: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  loginButtonText: { color: '#fff', fontSize: 17, fontFamily: 'Poppins_700Bold', lineHeight: 20 },
  featuresSection: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  featureItem: { flexDirection: 'row', alignItems: 'center', width: '48%', marginBottom: 14 },
  featureIconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10, backgroundColor: ACCENT + '15' },
  featureText: { fontSize: 13, color: '#555', fontFamily: 'Poppins_500Medium' },
  signUpSection: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  signUpText: { fontSize: 15, color: '#666' },
  signUpLink: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: ACCENT },
})
