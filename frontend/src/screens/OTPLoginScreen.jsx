import React, { useState, useRef } from 'react'
import {
  View,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableOpacity,
  StyleSheet,
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
import { sendOTP, verifyOTP } from '../services/api'

const ACCENT = '#C8102E'

function Text({ style, ...props }) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, style]} />
}
function TextInput({ style, ...props }) {
  return <RNTextInput {...props} style={[{ fontFamily: 'Poppins_400Regular' }, style]} />
}

export default function OTPLoginScreen() {
  const router   = useRouter()
  const dispatch = useDispatch()

  const [step,     setStep]     = useState('phone') // 'phone' | 'otp'
  const [phone,    setPhone]    = useState('')
  const [otp,      setOtp]      = useState(['', '', '', '', '', ''])
  const [loading,  setLoading]  = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  const otpRefs = useRef([])

  // ── Resend countdown ────────────────────────────────────────────────────
  const startCountdown = () => {
    setResendTimer(30)
    const id = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(id); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // ── Send OTP ─────────────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.')
      return
    }
    setLoading(true)
    try {
      const res = await sendOTP(digits)
      if (res.success) {
        setStep('otp')
        startCountdown()
      } else {
        Alert.alert('Error', res.error || 'Failed to send OTP.')
      }
    } catch {
      Alert.alert('Connection Error', 'Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  // ── Verify OTP ───────────────────────────────────────────────────────────
  const handleVerifyOTP = async () => {
    const code = otp.join('')
    if (code.length < 6) {
      Alert.alert('Incomplete', 'Please enter the full 6-digit OTP.')
      return
    }
    setLoading(true)
    try {
      const res = await verifyOTP({ phone: phone.replace(/\D/g, ''), otp: code })
      if (res.success) {
        dispatch(setUser({ user: res.user, token: res.token }))
        router.replace('/home')
      } else {
        Alert.alert('Invalid OTP', res.error || 'OTP is incorrect or expired.')
      }
    } catch {
      Alert.alert('Connection Error', 'Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP digit input handler ──────────────────────────────────────────────
  const handleOtpChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ACCENT} />

      {/* Header */}
      <LinearGradient colors={[ACCENT, '#a00d24']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="phone-portrait-outline" size={28} color={ACCENT} />
          </View>
          <Text style={styles.headerTitle}>OTP Login</Text>
          <Text style={styles.headerSub}>
            {step === 'phone'
              ? 'Enter your phone number to receive a one-time password'
              : `OTP sent to +91 ${phone}`}
          </Text>
        </View>
      </LinearGradient>

      {/* Card */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.card}>
          {step === 'phone' ? (
            <>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor="#bbb"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>

              <Text style={styles.hint}>
                We'll send a 6-digit OTP to this number.
              </Text>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleSendOTP}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[ACCENT, '#a00d24']} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Text style={styles.actionBtnText}>Send OTP</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Enter OTP</Text>
              <Text style={styles.otpSubtitle}>6-digit code sent to +91 {phone}</Text>

              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={ref => { otpRefs.current[i] = ref }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={text => handleOtpChange(text, i)}
                    onKeyPress={e => handleOtpKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Resend */}
              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive it? </Text>
                {resendTimer > 0
                  ? <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                  : <TouchableOpacity onPress={handleSendOTP}>
                      <Text style={styles.resendLink}>Resend OTP</Text>
                    </TouchableOpacity>
                }
              </View>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleVerifyOTP}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[ACCENT, '#a00d24']} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Text style={styles.actionBtnText}>Verify & Login</Text>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.changeNumberRow} onPress={() => { setStep('phone'); setOtp(['','','','','','']) }}>
                <Text style={styles.changeNumberText}>Change phone number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  backBtn: { marginBottom: 16 },
  headerContent: { alignItems: 'center' },
  headerIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },

  // Card
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
  label: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#111', marginBottom: 12 },

  // Phone input
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  countryCode: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: '#f0f0f0',
    borderRightWidth: 1,
    borderRightColor: '#e8e8e8',
  },
  countryCodeText: { fontSize: 15, color: '#333', fontFamily: 'Poppins_500Medium' },
  phoneInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, fontSize: 16, color: '#333' },
  hint: { fontSize: 12, color: '#aaa', marginBottom: 24, lineHeight: 18 },

  // OTP boxes
  otpSubtitle: { fontSize: 12, color: '#888', marginBottom: 20, marginTop: -4 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  otpBox: {
    width: 46,
    height: 54,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#111',
    backgroundColor: '#fafafa',
    textAlign: 'center',
  },
  otpBoxFilled: { borderColor: ACCENT, backgroundColor: '#fff5f7' },

  // Resend
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  resendText: { fontSize: 13, color: '#888' },
  resendTimer: { fontSize: 13, color: '#aaa', fontFamily: 'Poppins_500Medium' },
  resendLink: { fontSize: 13, color: ACCENT, fontFamily: 'Poppins_600SemiBold' },

  // Action button
  actionBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  actionGradient: {
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  actionBtnText: { color: '#fff', fontSize: 17, fontFamily: 'Poppins_700Bold' },

  // Change number
  changeNumberRow: { alignItems: 'center', paddingVertical: 4 },
  changeNumberText: { fontSize: 13, color: '#888', fontFamily: 'Poppins_500Medium' },
})
