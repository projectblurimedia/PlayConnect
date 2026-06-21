import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

let _showFn = null

export const AlertManager = {
  _register(fn) { _showFn = fn },
  alert(title, message, buttons, _options) {
    _showFn?.({
      title: title || '',
      message: message || '',
      buttons: buttons?.length ? buttons : [{ text: 'OK' }],
    })
  },
}

export function showAlert(title, message, buttons, options) {
  AlertManager.alert(title, message, buttons, options)
}

function resolveType(title, buttons) {
  const t = (title || '').toLowerCase()
  const hasDestructive = buttons?.some(b => b.style === 'destructive')
  if (
    t.includes('error') || t.includes('fail') || t.includes('invalid') ||
    t.includes('mismatch') || t.includes('incomplete') || t.includes('denied') ||
    t.includes('cannot') || t.includes('required') || t.includes('missing') ||
    t.includes('connection error') || t.includes('upload fail')
  ) {
    return { icon: 'close-circle', grad: ['#FF6B6B', '#C8102E'] }
  }
  if (
    t.includes('success') || t.includes('booked!') || t.includes('posted!') ||
    t.includes('forwarded') || t.includes('reset') || t.includes('sent') ||
    t.includes('uploaded') || t.includes('done') || t.includes('signed')
  ) {
    return { icon: 'checkmark-circle', grad: ['#43E97B', '#0FB06A'] }
  }
  if (
    hasDestructive ||
    t.includes('logout') || t.includes('delete') || t.includes('remove') ||
    t.includes('cancel booking') || t.includes('undo') || t.includes('abandon') ||
    t.includes('block user') || t.includes('report') || t.includes('wait')
  ) {
    return { icon: 'warning', grad: ['#FFD060', '#FF8C00'] }
  }
  return { icon: 'information-circle', grad: ['#60C8FF', '#2196F3'] }
}

export function GlobalAlert() {
  const [config, setConfig] = useState(null)
  const scale = useRef(new Animated.Value(0.82)).current
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    AlertManager._register(setConfig)
    return () => AlertManager._register(null)
  }, [])

  useEffect(() => {
    if (!config) return
    scale.setValue(0.82)
    fade.setValue(0)
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 65, friction: 9, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start()
  }, [config])

  if (!config) return null

  const { title, message, buttons } = config
  const { icon, grad } = resolveType(title, buttons)
  const cancelBtn = buttons.find(b => b.style === 'cancel')
  const actionBtns = buttons.filter(b => b.style !== 'cancel')

  const dismiss = (btn) => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.88, duration: 140, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setConfig(null)
      btn?.onPress?.()
    })
  }

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={() => dismiss(cancelBtn)}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => dismiss(cancelBtn)} />
        <Animated.View
          style={[s.card, { transform: [{ scale }], opacity: fade }]}
          onStartShouldSetResponder={() => true}
        >
          <LinearGradient colors={grad} style={s.iconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name={icon} size={36} color="#fff" />
          </LinearGradient>

          <Text style={s.title}>{title}</Text>
          {!!message && <Text style={s.msg}>{message}</Text>}

          <View style={[s.btnRow, buttons.length === 1 && s.btnRowCenter]}>
            {cancelBtn && (
              <TouchableOpacity style={s.cancelBtn} onPress={() => dismiss(cancelBtn)} activeOpacity={0.72}>
                <Text style={s.cancelTxt}>{cancelBtn.text}</Text>
              </TouchableOpacity>
            )}
            {actionBtns.map((btn, i) => {
              const btnGrad = btn.style === 'destructive' ? ['#FF6B6B', '#C8102E'] : grad
              return (
                <TouchableOpacity key={i} style={s.actionWrap} onPress={() => dismiss(btn)} activeOpacity={0.82}>
                  <LinearGradient colors={btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.actionBtn}>
                    <Text style={s.actionTxt}>{btn.text}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    paddingTop: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 18,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  msg: {
    fontSize: 13.5,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    width: '100%',
  },
  btnRowCenter: {
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F0F0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelTxt: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#666',
  },
  actionWrap: {
    flex: 1,
  },
  actionBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTxt: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
})
