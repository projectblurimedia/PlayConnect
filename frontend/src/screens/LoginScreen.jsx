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

// ── Replace these with your Google Cloud OAuth 2.0 client IDs ──────────────
const GOOGLE_WEB_CLIENT_ID     = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'
const GOOGLE_IOS_CLIENT_ID     = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com'
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com'
// ───────────────────────────────────────────────────────────────────────────

const ACCENT = '#C8102E'

function Text({ style, ...props }) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, style]} />
}
function TextInput({ style, ...props }) {
  return <RNTextInput {...props} style={[{ fontFamily: 'Poppins_400Regular' }, style]} />
}

export default function LoginScreen() {
  const router   = useRouter()
  const dispatch = useDispatch()

  const [identifier,   setIdentifier]   = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // ── Google OAuth ────────────────────────────────────────────────────────
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId:     GOOGLE_WEB_CLIENT_ID,
    iosClientId:     GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  })

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleToken(response.authentication?.accessToken)
    } else if (response?.type === 'error') {
      Alert.alert('Google Sign-In Failed', response.error?.message || 'Try again.')
      setGoogleLoading(false)
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
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
      <StatusBar barStyle="light-content" backgroundColor={ACCENT} />

      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Red blobs — pushed far to edges so they don't cover centre text */}
        <View style={styles.blobLeft} />
        <View style={styles.blobRight} />

        {/* Faint sport icons row */}
        <View style={styles.iconsRow}>
          {['🏏', '⚽', '🏀', '🏸'].map((icon, i) => (
            <RNText key={i} style={styles.sportIcon}>{icon}</RNText>
          ))}
        </View>

        {/* All text content sits above blobs */}
        <View style={styles.logoBlock}>
          {/* P badge */}
          <View style={styles.pBadge}>
            <Text style={styles.pLetter}>P</Text>
            <Ionicons name="walk" size={12} color="#fff" style={styles.pRunner} />
          </View>

          {/* Brand name */}
          <Text style={styles.brandRow}>
            <Text style={styles.brandPlay}>PLAY</Text>
            <Text style={styles.brandConnect}>CONNECT</Text>
          </Text>

          {/* Tagline — single Text node so no inline nesting wrapping issues */}
          <Text style={styles.tagline}>
            {'STOP VIRTUAL GAMES. START '}
            <Text style={styles.taglineAccent}>REAL BATTLES.</Text>
          </Text>
        </View>
      </View>

      {/* ── Scrollable card area ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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

            {/* Email / Phone input */}
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={ACCENT} style={styles.inputIconLeft} />
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

            {/* Password input */}
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={ACCENT} style={styles.inputIconLeft} />
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
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[ACCENT, '#a00d24']}
                style={styles.loginGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Text style={styles.loginBtnText}>Login</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* OR divider */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orLabel}>OR CONTINUE WITH</Text>
              <View style={styles.orLine} />
            </View>

            {/* Google button (full-width) */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={() => {
                setGoogleLoading(true)
                promptAsync()
              }}
              disabled={!request || googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading
                ? <ActivityIndicator size="small" color="#EA4335" />
                : <>
                    <AntDesign name="google" size={20} color="#EA4335" />
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </>
              }
            </TouchableOpacity>

            {/* OTP button */}
            <TouchableOpacity
              style={styles.otpBtn}
              onPress={() => router.push('/(auth)/otp-login')}
              activeOpacity={0.8}
            >
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#efefef',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 28,
    alignItems: 'center',
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  // Blobs — pushed far down/out so they only show as small corner accents
  blobLeft: {
    position: 'absolute',
    left: -100,
    bottom: -90,
    width: 170,
    height: 150,
    backgroundColor: ACCENT,
    borderRadius: 80,
    transform: [{ rotate: '-25deg' }],
    opacity: 0.88,
    zIndex: 1,
    elevation: 1,
  },
  blobRight: {
    position: 'absolute',
    right: -100,
    bottom: -90,
    width: 170,
    height: 150,
    backgroundColor: ACCENT,
    borderRadius: 80,
    transform: [{ rotate: '25deg' }],
    opacity: 0.88,
    zIndex: 1,
    elevation: 1,
  },
  iconsRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    flexDirection: 'row',
    gap: 28,
    opacity: 0.12,
  },
  sportIcon: { fontSize: 26 },

  // logoBlock always renders above blobs
  logoBlock: { alignItems: 'center', zIndex: 10, elevation: 10 },

  // P badge
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
    elevation: 6,
    zIndex: 10,
  },
  pLetter: { fontSize: 36, fontFamily: 'Poppins_800ExtraBold', color: '#fff', lineHeight: 42 },
  pRunner: { position: 'absolute', bottom: 7, right: 7 },

  // Brand
  brandRow: { fontSize: 28, marginBottom: 6, zIndex: 10 },
  brandPlay:    { fontFamily: 'Poppins_800ExtraBold', color: '#111' },
  brandConnect: { fontFamily: 'Poppins_800ExtraBold', color: ACCENT },

  // Tagline
  tagline: {
    fontSize: 10.5,
    color: '#444',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 17,
    zIndex: 10,
  },
  taglineAccent: { color: ACCENT, fontFamily: 'Poppins_700Bold' },

  // ── Card ─────────────────────────────────────────────────────────────────
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 8,
  },

  // Welcome
  welcomeTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#111',
    textAlign: 'center',
    marginBottom: 4,
  },
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
  inputIconLeft: { marginRight: 10 },
  inputField: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#333' },
  eyeBtn: { padding: 4 },

  // Forgot
  forgotRow: { alignItems: 'flex-end', marginBottom: 18 },
  forgotText: { color: ACCENT, fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  // Login button
  loginBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 22 },
  loginGradient: {
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loginBtnText: { color: '#fff', fontSize: 17, fontFamily: 'Poppins_700Bold' },

  // OR divider
  orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: '#ececec' },
  orLabel: { fontSize: 11, color: '#bbb', marginHorizontal: 10, letterSpacing: 1, fontFamily: 'Poppins_500Medium' },

  // Google button (full-width)
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  googleBtnText: { fontSize: 14, color: '#333', fontFamily: 'Poppins_500Medium' },

  // OTP button
  otpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 22,
    backgroundColor: '#fff',
  },
  otpBtnText: { fontSize: 14, color: '#333', fontFamily: 'Poppins_500Medium' },

  // Features
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  featureItem: { alignItems: 'center', flex: 1 },
  featureLabel: { fontSize: 10.5, color: '#666', textAlign: 'center', marginTop: 5 },

  // Sign up
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  signupText: { fontSize: 14, color: '#666' },
  signupLink: { fontSize: 14, fontFamily: 'Poppins_700Bold', color: ACCENT },
})
