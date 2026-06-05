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
  ScrollView,
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

  // step: 'phone' → enter phone; 'otp' → enter OTP (phone locked)
  const [step,        setStep]        = useState('phone')
  const [phone,       setPhone]       = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')  // returned by backend
  const [otp,         setOtp]         = useState(['', '', '', '', '', ''])
  const [loading,     setLoading]     = useState(false)
  const [resendTimer, setResendTimer] = useState(0) // dev-mode hint

  const otpRefs = useRef([])

  // ── Countdown for resend ────────────────────────────────────────────────
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
        setMaskedPhone(res.maskedPhone)
        setStep('otp')
        startCountdown()
        // Auto-focus first OTP box
        setTimeout(() => otpRefs.current[0]?.focus(), 300)
      } else {
        Alert.alert('Error', res.error || 'Failed to send OTP.')
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Could not connect to the server.'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP (reuse same handler) ─────────────────────────────────────
  const handleResend = async () => {
    setOtp(['', '', '', '', '', ''])
    await handleSendOTP()
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
    } catch (err) {
      const msg = err?.response?.data?.error || 'Could not connect to the server.'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  // ── OTP box input handlers ───────────────────────────────────────────────
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
      <LinearGradient
        colors={[ACCENT, '#a00d24']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIconBox}>
            <Ionicons name="phone-portrait-outline" size={28} color={ACCENT} />
          </View>
          <Text style={styles.headerTitle}>OTP Login</Text>
          <Text style={styles.headerSub}>
            {step === 'phone'
              ? 'Enter your registered phone number'
              : `OTP sent to +91 ${maskedPhone}`}
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>

            {step === 'phone' ? (
              /* ── Step 1: phone entry ─────────────────────────────── */
              <>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="10-digit number"
                    placeholderTextColor="#bbb"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoFocus
                  />
                </View>
                <Text style={styles.hint}>
                  We'll send an OTP to your registered number.
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
                      : <><Text style={styles.actionBtnText}>Send OTP</Text><Ionicons name="arrow-forward" size={20} color="#fff" /></>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              /* ── Step 2: OTP entry (phone locked/masked) ─────────── */
              <>
                {/* Masked phone — non-editable display */}
                <Text style={styles.label}>Registered Number</Text>
                <View style={styles.maskedPhoneBox}>
                  <Ionicons name="phone-portrait-outline" size={18} color={ACCENT} style={{ marginRight: 10 }} />
                  <Text style={styles.maskedPhoneText}>+91 {maskedPhone}</Text>
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={12} color="#fff" />
                  </View>
                </View>

                {/* OTP boxes */}
                <Text style={styles.label}>Enter OTP</Text>
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
                    : <TouchableOpacity onPress={handleResend}>
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
                      : <><Text style={styles.actionBtnText}>Verify & Login</Text><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /></>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.changeRow}
                  onPress={() => { setStep('phone'); setOtp(['', '', '', '', '', '']) }}
                >
                  <Text style={styles.changeText}>Change phone number</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  backBtn: { marginBottom: 16 },
  headerContent: { alignItems: 'center' },
  headerIconBox: {
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },

  scroll: { flexGrow: 1, paddingBottom: 40 },
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

  label: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#111', marginBottom: 10 },

  // Phone input
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
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
  hint: { fontSize: 12, color: '#aaa', marginBottom: 22, lineHeight: 18 },

  // Masked phone display
  maskedPhoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f7',
    borderWidth: 1.5,
    borderColor: ACCENT + '40',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
  },
  maskedPhoneText: { flex: 1, fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#111', letterSpacing: 1 },
  lockedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // OTP boxes
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
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
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 22 },
  resendText: { fontSize: 13, color: '#888' },
  resendTimer: { fontSize: 13, color: '#aaa', fontFamily: 'Poppins_500Medium' },
  resendLink: { fontSize: 13, color: ACCENT, fontFamily: 'Poppins_600SemiBold' },

  // Action button
  actionBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  actionGradient: { paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  actionBtnText: { color: '#fff', fontSize: 17, fontFamily: 'Poppins_700Bold' },

  // Change number
  changeRow: { alignItems: 'center', paddingVertical: 4 },
  changeText: { fontSize: 13, color: '#888', fontFamily: 'Poppins_500Medium' },
})
