import React, { useState, useEffect } from 'react'
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
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons, AntDesign } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useDispatch } from 'react-redux'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { setUser } from '../store/userSlice'
import { loginUser, googleAuth } from '../services/api'

WebBrowser.maybeCompleteAuthSession()

// ── Set your Google Cloud OAuth 2.0 client IDs here ───────────────────────────
// Get them from: https://console.cloud.google.com → APIs & Services → Credentials
const GOOGLE_WEB_CLIENT_ID     = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'
const GOOGLE_IOS_CLIENT_ID     = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com'
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com'
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT  = '#C8102E'
const SCREEN_H = Dimensions.get('window').height

function Text({ style, ...props }) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, style]} />
}
function TextInput({ style, ...props }) {
  return <RNTextInput {...props} style={[{ fontFamily: 'Poppins_400Regular' }, style]} />
}

export default function LoginScreen() {
  const router   = useRouter()
  const dispatch = useDispatch()

  const [identifier,    setIdentifier]    = useState('')
  const [password,      setPassword]      = useState('')
  const [showPassword,  setShowPassword]  = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // ── Google OAuth ────────────────────────────────────────────────────────
  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId:     GOOGLE_WEB_CLIENT_ID,
    iosClientId:     GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    prompt:          'select_account',
  })

  useEffect(() => {
    if (!response) return
    if (response.type === 'success') {
      handleGoogleToken(response.authentication?.accessToken)
    } else if (response.type === 'error') {
      Alert.alert('Google Sign-In Failed', response.error?.message || 'Please try again.')
      setGoogleLoading(false)
    } else {
      setGoogleLoading(false)
    }
  }, [response])

  const handleGoogleToken = async (accessToken) => {
    if (!accessToken) { setGoogleLoading(false); return }
    try {
      const result = await googleAuth(accessToken)
      if (result.success) {
        dispatch(setUser({ user: result.user, token: result.token }))
        router.replace('/home')
      } else if (result.needsRegistration) {
        Alert.alert(
          'Account Not Found',
          `No PlayConnect account is linked to ${result.googleInfo?.email}.\n\nPlease register first.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register', onPress: () => router.replace('/register') },
          ],
        )
      } else {
        Alert.alert('Sign-In Failed', result.error || 'Google sign-in failed.')
      }
    } catch {
      Alert.alert('Error', 'Could not complete Google sign-in. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGooglePress = () => {
    if (GOOGLE_WEB_CLIENT_ID.startsWith('YOUR_')) {
      Alert.alert(
        'Google Sign-In Setup Required',
        'To enable Google Sign-In:\n\n1. Go to console.cloud.google.com\n2. Create OAuth 2.0 credentials\n3. Replace the placeholder IDs at the top of LoginScreen.jsx',
      )
      return
    }
    setGoogleLoading(true)
    promptAsync()
  }

  // ── Email / Password login ──────────────────────────────────────────────
  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Error', 'Please enter your email/phone and password')
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
      <StatusBar barStyle="dark-content" backgroundColor="#efefef" />

      {/* ── Full-height side blobs — behind everything ── */}
      <View style={styles.blobLeft} />
      <View style={styles.blobRight} />

      {/* ── Faint sport icon decoration ── */}
      <View style={styles.iconsRow} pointerEvents="none">
        {['🏏', '⚽', '🏀', '🏸'].map((icon, i) => (
          <RNText key={i} style={styles.sportIcon}>{icon}</RNText>
        ))}
      </View>

      {/* ── Logo section ── */}
      <View style={styles.logoSection}>
        <View style={styles.pBadge}>
          <Text style={styles.pLetter}>P</Text>
          <Ionicons name="walk" size={12} color="#fff" style={styles.pRunner} />
        </View>
        <Text style={styles.brandRow}>
          <Text style={styles.brandPlay}>PLAY</Text>
          <Text style={styles.brandConnect}>CONNECT</Text>
        </Text>
        <Text style={styles.tagline}>
          {'STOP VIRTUAL GAMES. START '}
          <Text style={styles.taglineAccent}>REAL BATTLES.</Text>
        </Text>
      </View>

      {/* ── Card + footer ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>

            {/* Welcome */}
            <Text style={styles.welcomeTitle}>
              Welcome <Text style={styles.welcomeAccent}>Back!</Text>
            </Text>
            <Text style={styles.welcomeSub}>Login to continue your journey</Text>

            {/* Email / Phone */}
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={ACCENT} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Email or Phone Number"
                placeholderTextColor="#bbb"
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={ACCENT} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Password"
                placeholderTextColor="#bbb"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={22} color="#bbb" />
              </TouchableOpacity>
            </View>

            {/* Forgot password */}
            <TouchableOpacity style={styles.forgotRow} onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={[ACCENT, '#a00d24']} style={styles.loginGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Text style={styles.loginBtnText}>Login</Text><Ionicons name="arrow-forward" size={20} color="#fff" /></>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* OR divider */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orLabel}>OR CONTINUE WITH</Text>
              <View style={styles.orLine} />
            </View>

            {/* Google — always enabled; shows setup alert if IDs not configured */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGooglePress}
              disabled={googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading
                ? <ActivityIndicator size="small" color="#EA4335" />
                : <><AntDesign name="google" size={20} color="#EA4335" /><Text style={styles.googleBtnText}>Continue with Google</Text></>
              }
            </TouchableOpacity>

            {/* OTP */}
            <TouchableOpacity style={styles.otpBtn} onPress={() => router.push('/(auth)/otp-login')} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={20} color={ACCENT} />
              <Text style={styles.otpBtnText}>Login with OTP</Text>
            </TouchableOpacity>

            {/* Feature strip */}
            <View style={styles.featuresRow}>
              {[
                { icon: 'shield-checkmark-outline', label: 'Secure Login' },
                { icon: 'flash-outline',            label: 'Quick Access' },
                { icon: 'trophy-outline',           label: 'Play. Connect. Win.' },
              ].map((f) => (
                <View key={f.label} style={styles.featureItem}>
                  <Ionicons name={f.icon} size={22} color={ACCENT} />
                  <Text style={styles.featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Sign-up footer */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/register')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  // ── Root container ─────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#efefef',
  },

  // ── Full-height blobs — sit behind every other layer ──────────────────
  blobLeft: {
    position: 'absolute',
    left: -85,
    top: -60,
    width: 190,
    height: SCREEN_H + 120,    // taller than screen so they never end
    backgroundColor: ACCENT,
    borderRadius: 95,
    zIndex: 1,
    elevation: 1,
    opacity: 0.88,
  },
  blobRight: {
    position: 'absolute',
    right: -85,
    top: -60,
    width: 190,
    height: SCREEN_H + 120,
    backgroundColor: ACCENT,
    borderRadius: 95,
    zIndex: 1,
    elevation: 1,
    opacity: 0.88,
  },

  // ── Faint sport icons ─────────────────────────────────────────────────
  iconsRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    opacity: 0.1,
    zIndex: 2,
  },
  sportIcon: { fontSize: 26 },

  // ── Logo section ───────────────────────────────────────────────────────
  logoSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 58 : 42,
    paddingBottom: 24,
    zIndex: 10,
    elevation: 10,
  },
  pBadge: {
    width: 56,
    height: 56,
    backgroundColor: ACCENT,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 12,
  },
  pLetter: { fontSize: 36, fontFamily: 'Poppins_800ExtraBold', color: '#fff', lineHeight: 42 },
  pRunner: { position: 'absolute', bottom: 7, right: 7 },
  brandRow: { fontSize: 28, marginBottom: 6 },
  brandPlay:     { fontFamily: 'Poppins_800ExtraBold', color: '#111' },
  brandConnect:  { fontFamily: 'Poppins_800ExtraBold', color: ACCENT },
  tagline: {
    fontSize: 10.5,
    color: '#444',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 17,
  },
  taglineAccent: { color: ACCENT, fontFamily: 'Poppins_700Bold' },

  // ── Scrollable area ────────────────────────────────────────────────────
  kav: { flex: 1, zIndex: 10 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  // ── Card — elevated above blobs ────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 20,
  },

  // Welcome
  welcomeTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#111', textAlign: 'center', marginBottom: 4 },
  welcomeAccent: { color: ACCENT },
  welcomeSub: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 22 },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 14,
    backgroundColor: '#fafafa',
    minHeight: 54,
  },
  inputIcon: { marginRight: 10 },
  inputField: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#333' },
  eyeBtn: { padding: 4 },

  // Forgot
  forgotRow: { alignItems: 'flex-end', marginBottom: 18 },
  forgotText: { color: ACCENT, fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  // Login button
  loginBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 22 },
  loginGradient: { paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  loginBtnText: { color: '#fff', fontSize: 17, fontFamily: 'Poppins_700Bold' },

  // OR divider
  orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: '#ececec' },
  orLabel: { fontSize: 11, color: '#bbb', marginHorizontal: 10, letterSpacing: 1, fontFamily: 'Poppins_500Medium' },

  // Google
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, paddingVertical: 13,
    backgroundColor: '#fff', marginBottom: 12,
  },
  googleBtnText: { fontSize: 14, color: '#333', fontFamily: 'Poppins_500Medium' },

  // OTP
  otpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, paddingVertical: 13,
    marginBottom: 22, backgroundColor: '#fff',
  },
  otpBtnText: { fontSize: 14, color: '#333', fontFamily: 'Poppins_500Medium' },

  // Features
  featuresRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 18, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  featureItem: { alignItems: 'center', flex: 1 },
  featureLabel: { fontSize: 10.5, color: '#666', textAlign: 'center', marginTop: 5 },

  // Sign up
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  signupText: { fontSize: 14, color: '#666' },
  signupLink: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: ACCENT },
})
