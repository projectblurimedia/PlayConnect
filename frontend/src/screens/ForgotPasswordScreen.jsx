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
import { forgotPasswordSendOTP, resetPassword } from '../services/api'

const ACCENT = '#C8102E'

function Text({ style, ...props }) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, style]} />
}
function TextInput({ style, ...props }) {
  return <RNTextInput {...props} style={[{ fontFamily: 'Poppins_400Regular' }, style]} />
}

export default function ForgotPasswordScreen() {
  const router = useRouter()

  const [step,         setStep]         = useState('phone')   // 'phone' | 'reset'
  const [phone,        setPhone]        = useState('')
  const [maskedPhone,  setMaskedPhone]  = useState('')
  const [otp,          setOtp]          = useState(['', '', '', '', '', ''])
  const [newPassword,  setNewPassword]  = useState('')
  const [confirmPass,  setConfirmPass]  = useState('')
  const [showNew,      setShowNew]      = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [resendTimer,  setResendTimer]  = useState(0)

  const otpRefs = useRef([])

  const startCountdown = () => {
    setResendTimer(30)
    const id = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(id); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.')
      return
    }
    setLoading(true)
    try {
      const res = await forgotPasswordSendOTP(digits)
      if (res.success) {
        setMaskedPhone(res.maskedPhone)
        setStep('reset')
        startCountdown()
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

  const handleResend = async () => {
    setOtp(['', '', '', '', '', ''])
    await handleSendOTP()
  }

  // ── OTP box handlers ──────────────────────────────────────────────────────
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

  // ── Step 2: reset password ────────────────────────────────────────────────
  const handleReset = async () => {
    const code = otp.join('')
    if (code.length < 6) {
      Alert.alert('Incomplete', 'Please enter the full 6-digit OTP.')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPass) {
      Alert.alert('Mismatch', 'Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await resetPassword({ phone: phone.replace(/\D/g, ''), otp: code, newPassword })
      if (res.success) {
        Alert.alert('Success', res.message || 'Password reset successfully!', [
          { text: 'Login', onPress: () => router.replace('/(auth)/login') },
        ])
      } else {
        Alert.alert('Error', res.error || 'Failed to reset password.')
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Could not connect to the server.'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
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
            <Ionicons name="key-outline" size={28} color={ACCENT} />
          </View>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <Text style={styles.headerSub}>
            {step === 'phone'
              ? 'Enter your registered phone number'
              : `Set a new password for +91 ${maskedPhone}`}
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>

            {step === 'phone' ? (
              /* ── Step 1 ─── */
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
                  We'll send a 6-digit OTP to verify your identity.
                </Text>
                <TouchableOpacity style={styles.actionBtn} onPress={handleSendOTP} disabled={loading} activeOpacity={0.85}>
                  <LinearGradient colors={[ACCENT, '#a00d24']} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Text style={styles.actionBtnText}>Send OTP</Text><Ionicons name="arrow-forward" size={20} color="#fff" /></>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              /* ── Step 2 ─── */
              <>
                {/* Masked phone */}
                <Text style={styles.label}>Registered Number</Text>
                <View style={styles.maskedPhoneBox}>
                  <Ionicons name="phone-portrait-outline" size={18} color={ACCENT} style={{ marginRight: 10 }} />
                  <Text style={styles.maskedPhoneText}>+91 {maskedPhone}</Text>
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={12} color="#fff" />
                  </View>
                </View>


                {/* OTP */}
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

                {/* New password */}
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={ACCENT} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor="#bbb"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNew}
                  />
                  <TouchableOpacity onPress={() => setShowNew(p => !p)} style={styles.eyeBtn}>
                    <Ionicons name={showNew ? 'eye-outline' : 'eye-off-outline'} size={20} color="#bbb" />
                  </TouchableOpacity>
                </View>

                {/* Confirm password */}
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={ACCENT} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Re-enter password"
                    placeholderTextColor="#bbb"
                    value={confirmPass}
                    onChangeText={setConfirmPass}
                    secureTextEntry={!showConfirm}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(p => !p)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={20} color="#bbb" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.actionBtn} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
                  <LinearGradient colors={[ACCENT, '#a00d24']} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Text style={styles.actionBtnText}>Reset Password</Text><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /></>
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

  header: { paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingBottom: 32, paddingHorizontal: 20 },
  backBtn: { marginBottom: 16 },
  headerContent: { alignItems: 'center' },
  headerIconBox: { width: 60, height: 60, backgroundColor: '#fff', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },

  scroll: { flexGrow: 1, paddingBottom: 40 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 20, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 16, elevation: 8 },

  label: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#111', marginBottom: 10 },

  phoneRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 14, overflow: 'hidden', marginBottom: 12, backgroundColor: '#fafafa' },
  countryCode: { paddingHorizontal: 14, paddingVertical: 16, backgroundColor: '#f0f0f0', borderRightWidth: 1, borderRightColor: '#e8e8e8' },
  countryCodeText: { fontSize: 15, color: '#333', fontFamily: 'Poppins_500Medium' },
  phoneInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, fontSize: 16, color: '#333' },
  hint: { fontSize: 12, color: '#aaa', marginBottom: 22, lineHeight: 18 },

  maskedPhoneBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff5f7', borderWidth: 1.5, borderColor: ACCENT + '40', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16 },
  maskedPhoneText: { flex: 1, fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#111', letterSpacing: 1 },
  lockedBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },


  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  otpBox: { width: 46, height: 54, borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 12, fontSize: 22, fontFamily: 'Poppins_700Bold', color: '#111', backgroundColor: '#fafafa', textAlign: 'center' },
  otpBoxFilled: { borderColor: ACCENT, backgroundColor: '#fff5f7' },

  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  resendText: { fontSize: 13, color: '#888' },
  resendTimer: { fontSize: 13, color: '#aaa', fontFamily: 'Poppins_500Medium' },
  resendLink: { fontSize: 13, color: ACCENT, fontFamily: 'Poppins_600SemiBold' },

  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e8e8e8', borderRadius: 14, marginBottom: 16, paddingHorizontal: 14, backgroundColor: '#fafafa', minHeight: 54 },
  inputField: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#333' },
  eyeBtn: { padding: 4 },

  actionBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  actionGradient: { paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  actionBtnText: { color: '#fff', fontSize: 17, fontFamily: 'Poppins_700Bold' },

  changeRow: { alignItems: 'center', paddingVertical: 4 },
  changeText: { fontSize: 13, color: '#888', fontFamily: 'Poppins_500Medium' },
})
