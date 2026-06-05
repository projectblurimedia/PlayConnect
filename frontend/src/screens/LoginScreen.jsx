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

// ── Replace with your Google Cloud OAuth 2.0 client IDs ──────────────────────
const GOOGLE_WEB_CLIENT_ID     = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'
const GOOGLE_IOS_CLIENT_ID     = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com'
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com'
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT   = '#C8102E'
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

  // ── Google OAuth ─────────────────────────────────────────────────────────
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
          `No PlayConnect account linked to ${result.googleInfo?.email}.\n\nPlease register first.`,
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
        'Setup Required',
        '1. Go to console.cloud.google.com\n2. Create OAuth 2.0 credentials\n3. Replace the placeholder IDs at the top of LoginScreen.jsx',
      )
      return
    }
    setGoogleLoading(true)
    promptAsync()
  }

  // ── Email / Password login ───────────────────────────────────────────────
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
      Alert.alert('Connection Error', 'Could not connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#efefef" />

      {/* Full-height side blobs */}
      <View style={styles.blobLeft} />
      <View style={styles.blobRight} />

      {/* Faint sport icons */}
      <View style={styles.iconsRow} pointerEvents="none">
        {['🏏', '⚽', '🏀', '🏸'].map((icon, i) => (
          <RNText key={i} style={styles.sportIcon}>{icon}</RNText>
        ))}
      </View>

      {/* Logo section */}
      <View style={styles.logoSection}>
        <View style={styles.pBadge}>
          <Text style={styles.pLetter}>P</Text>
          <Ionicons name="walk" size={11} color="#fff" style={styles.pRunner} />
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

      {/* Card */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
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

            {/* Email */}
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={ACCENT} style={styles.inputIcon} />
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
              <Ionicons name="lock-closed-outline" size={18} color={ACCENT} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Password"
                placeholderTextColor="#bbb"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#bbb" />
              </TouchableOpacity>
            </View>

            {/* Forgot */}
            <TouchableOpacity style={styles.forgotRow} onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login */}
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={[ACCENT, '#a00d24']} style={styles.loginGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Text style={styles.loginBtnText}>Login</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* OR */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orLabel}>OR CONTINUE WITH</Text>
              <View style={styles.orLine} />
            </View>

            {/* Google */}
            <TouchableOpacity style={styles.googleBtn} onPress={handleGooglePress} disabled={googleLoading} activeOpacity={0.8}>
              {googleLoading
                ? <ActivityIndicator size="small" color="#EA4335" />
                : <><AntDesign name="google" size={18} color="#EA4335" /><Text style={styles.googleBtnText}>Continue with Google</Text></>
              }
            </TouchableOpacity>

            {/* OTP */}
            <TouchableOpacity style={styles.otpBtn} onPress={() => router.push('/(auth)/otp-login')} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={18} color={ACCENT} />
              <Text style={styles.otpBtnText}>Login with OTP</Text>
            </TouchableOpacity>

            {/* Features */}
            <View style={styles.featuresRow}>
              {[
                { icon: 'shield-checkmark-outline', label: 'Secure Login' },
                { icon: 'flash-outline',            label: 'Quick Access' },
                { icon: 'trophy-outline',           label: 'Play. Connect. Win.' },
              ].map((f) => (
                <View key={f.label} style={styles.featureItem}>
                  <Ionicons name={f.icon} size={20} color={ACCENT} />
                  <Text style={styles.featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>

            {/* Sign up — inside card to avoid extra scroll space */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/register')}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#efefef' },

  // Full-height blobs
  blobLeft: {
    position: 'absolute',
    left: -85,
    top: -60,
    width: 140,
    height: SCREEN_H + 120,
    backgroundColor: ACCENT,
    borderRadius: 100,
    zIndex: 1,
    elevation: 1,
    opacity: 0.88,
  },
  blobRight: {
    position: 'absolute',
    right: -85,
    bottom: -60,
    width: 140,
    height: SCREEN_H + 120,
    backgroundColor: ACCENT,
    borderRadius: 95,
    zIndex: 1,
    elevation: 1,
    opacity: 0.88,
  },

  // Sport icons
  iconsRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 80 : 70,
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    gap: 70,
    opacity: 0.5,
    zIndex: 2,
  },
  sportIcon: { fontSize: 22 },

  // Logo section — compact
  logoSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 70 : 60,
    paddingBottom: 8,
    zIndex: 10,
    elevation: 10,
  },
  pBadge: {
    width: 50,
    height: 50,
    backgroundColor: ACCENT,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 12,
  },
  pLetter: { fontSize: 32, fontFamily: 'Poppins_800ExtraBold', color: '#fff', lineHeight: 38 },
  pRunner: { position: 'absolute', bottom: 6, right: 6 },
  brandRow: { fontSize: 26, marginBottom: 4 },
  brandPlay:    { fontFamily: 'Poppins_800ExtraBold', color: '#111' },
  brandConnect: { fontFamily: 'Poppins_800ExtraBold', color: ACCENT },
  tagline: {
    fontSize: 10,
    color: '#444',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 15,
  },
  taglineAccent: { color: ACCENT, fontFamily: 'Poppins_700Bold' },

  // Card
  kav: { flex: 1, zIndex: 10 },
  scrollContent: { flexGrow: 1, paddingBottom: 12 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginTop: 6,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 2,
    zIndex: 20,
  },

  // Welcome — reduced gap between title and subtitle
  welcomeTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#111',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 1,
  },
  welcomeAccent: { color: ACCENT },
  welcomeSub: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 28,
  },

  // Inputs — tighter
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    minHeight: 48,
  },
  inputIcon: { marginRight: 8 },
  inputField: { flex: 1, paddingVertical: 14, fontSize: 14, color: '#333' },
  eyeBtn: { padding: 4 },

  forgotRow: { alignItems: 'flex-end', marginBottom: 10 },
  forgotText: { color: ACCENT, fontSize: 12, fontFamily: 'Poppins_600SemiBold' },

  loginBtn: { borderRadius: 12, overflow: 'hidden', marginBottom: 14 },
  loginGradient: {
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loginBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },

  orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: '#ececec' },
  orLabel: { fontSize: 10, color: '#bbb', marginHorizontal: 8, letterSpacing: 0.8, fontFamily: 'Poppins_500Medium' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 11, paddingVertical: 11,
    backgroundColor: '#fff', marginBottom: 12,
  },
  googleBtnText: { fontSize: 13, color: '#333', fontFamily: 'Poppins_500Medium' },

  otpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 11, paddingVertical: 11,
    marginBottom: 14, backgroundColor: '#fff',
  },
  otpBtnText: { fontSize: 13, color: '#333', fontFamily: 'Poppins_500Medium' },

  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 14,
  },
  featureItem: { alignItems: 'center', flex: 1 },
  featureLabel: { fontSize: 9.5, color: '#666', textAlign: 'center', marginTop: 4 },

  // Sign up row — inside card
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  signupText: { fontSize: 13, color: '#666' },
  signupLink: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: ACCENT },
})
