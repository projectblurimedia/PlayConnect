import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  View, Text as RNText, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
  Modal, Alert, Image, Animated, PanResponder,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { io } from 'socket.io-client'
import {
  getChatHistory, getPlayerProfile, getConnectionStatus,
  deleteMessageForMe, deleteMessageForEveryone, forwardMessage, getConnections,
  deleteConversation,
  API_BASE_URL,
} from '../services/api'

const ACCENT = '#C8102E'
const BLUE = '#1a8cff'
const GREEN = '#25D366'

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

// ── Relative time helper ──────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr)
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatMsgTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function getDateLabel(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(todayStart.getDate() - 1)
  const weekAgoStart = new Date(todayStart)
  weekAgoStart.setDate(todayStart.getDate() - 6)
  const msgStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (msgStart >= todayStart) return 'Today'
  if (msgStart >= yesterdayStart) return 'Yesterday'
  if (msgStart >= weekAgoStart) {
    return d.toLocaleDateString([], { weekday: 'long' })
  }
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
}

function buildMessageItems(messages) {
  const items = []
  let lastLabel = null
  for (const msg of messages) {
    const label = getDateLabel(msg.createdAt)
    if (label !== lastLabel) {
      items.push({ _type: 'separator', label, id: `sep_${msg.createdAt}_${label}` })
      lastLabel = label
    }
    items.push({ ...msg, _type: 'message' })
  }
  return items
}

// ── Reliable bottom-sheet modal ───────────────────────────────────────────────
// A TouchableOpacity backdrop fills the space above the sheet.
// Tapping it closes. The sheet renders after (higher z-index), so sheet taps stay in the sheet.
function BottomSheet({ visible, onClose, children, isDark }) {
  const bg = isDark ? '#1c1c1e' : '#fff'
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.52)' }} onPress={onClose} activeOpacity={1} />
        <View style={[bss.sheet, { backgroundColor: bg }]}>
          <View style={bss.handle} />
          {children}
        </View>
      </View>
    </Modal>
  )
}
const bss = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 10, paddingBottom: 36, paddingHorizontal: 18,
    elevation: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 14,
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#c7c7cc', alignSelf: 'center', marginBottom: 16,
  },
})

// ── Message Info Modal ────────────────────────────────────────────────────────
function MessageInfoModal({ visible, onClose, message, isDark }) {
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = '#8e8e93'
  const divider = isDark ? '#2c2c2e' : '#f2f2f7'
  const previewBg = isDark ? '#2c2c2e' : '#f2f2f7'

  const statusMap = {
    SENDING: { label: 'Sending…', color: mutedColor, icon: 'time-outline' },
    SENT:    { label: 'Sent',      color: mutedColor, icon: 'paper-plane-outline' },
    DELIVERED: { label: 'Delivered', color: mutedColor, icon: 'mail-open-outline' },
    READ:    { label: 'Seen',      color: BLUE,       icon: 'eye' },
  }
  const s = statusMap[message?.status || 'SENT'] || statusMap.SENT
  const sentTime = message ? new Date(message.createdAt).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : ''

  return (
    <BottomSheet visible={visible} onClose={onClose} isDark={isDark}>
      <View style={infoS.headerRow}>
        <Text style={[infoS.title, { color: textColor }]}>Message Info</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle" size={24} color={mutedColor} />
        </TouchableOpacity>
      </View>
      <View style={[infoS.preview, { backgroundColor: previewBg }]}>
        <Text
          style={[infoS.previewText, {
            color: message?.deletedForEveryone ? mutedColor : textColor,
            fontStyle: message?.deletedForEveryone ? 'italic' : 'normal',
          }]}
          numberOfLines={4}
        >
          {message?.deletedForEveryone ? 'This message was deleted' : message?.content}
        </Text>
      </View>
      <View style={[infoS.row, { borderTopColor: divider }]}>
        <View style={[infoS.iconCircle, { backgroundColor: ACCENT + '18' }]}>
          <Ionicons name="time-outline" size={16} color={ACCENT} />
        </View>
        <View>
          <Text style={[infoS.rowLabel, { color: mutedColor }]}>Sent at</Text>
          <Text style={[infoS.rowVal, { color: textColor }]}>{sentTime}</Text>
        </View>
      </View>
      <View style={[infoS.row, { borderTopColor: divider }]}>
        <View style={[infoS.iconCircle, { backgroundColor: s.color + '18' }]}>
          <Ionicons name={s.icon} size={16} color={s.color} />
        </View>
        <View>
          <Text style={[infoS.rowLabel, { color: mutedColor }]}>Status</Text>
          <Text style={[infoS.rowVal, { color: s.color, fontFamily: 'Poppins_600SemiBold' }]}>{s.label}</Text>
        </View>
      </View>
    </BottomSheet>
  )
}
const infoS = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 17, fontFamily: 'Poppins_700Bold' },
  preview: { borderRadius: 14, padding: 14, marginBottom: 18 },
  previewText: { fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 11, fontFamily: 'Poppins_500Medium', marginBottom: 2 },
  rowVal: { fontSize: 14 },
})

// ── Long-press message menu ───────────────────────────────────────────────────
function MessageMenu({ visible, onClose, message, myId, isDark, onDeleteForMe, onUndoSend, onForward, onInfo }) {
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = '#8e8e93'
  const divider = isDark ? '#2c2c2e' : '#f2f2f7'
  const isMine = message?.fromId === myId

  const options = [
    { label: 'Info',          icon: 'information-circle-outline', onPress: onInfo,       color: textColor },
    { label: 'Forward',       icon: 'arrow-redo-outline',         onPress: onForward,    color: textColor },
    { label: 'Delete for Me', icon: 'trash-outline',              onPress: onDeleteForMe, color: '#ef4444' },
    ...(isMine ? [{ label: 'Undo Send', icon: 'arrow-undo-outline', onPress: onUndoSend, color: '#f97316' }] : []),
  ]

  return (
    <BottomSheet visible={visible} onClose={onClose} isDark={isDark}>
      <View style={menuS.headerRow}>
        <Text style={[menuS.title, { color: mutedColor }]}>Options</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle-outline" size={26} color={mutedColor} />
        </TouchableOpacity>
      </View>
      {options.map((opt, idx) => (
        <TouchableOpacity
          key={opt.label}
          style={[
            menuS.item,
            idx < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: divider },
          ]}
          onPress={() => { onClose(); opt.onPress() }}
          activeOpacity={0.65}
        >
          <View style={[menuS.iconWrap, {
            backgroundColor: opt.color === textColor
              ? (isDark ? '#2c2c2e' : '#f2f2f7')
              : opt.color + '18',
          }]}>
            <Ionicons name={opt.icon} size={20} color={opt.color} />
          </View>
          <Text style={[menuS.itemText, { color: opt.color }]}>{opt.label}</Text>
          <Ionicons name="chevron-forward" size={16} color={isDark ? '#3a3a3c' : '#d1d1d6'} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      ))}
    </BottomSheet>
  )
}
const menuS = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.6 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13 },
  itemText: { fontSize: 15, fontFamily: 'Poppins_500Medium', flex: 1 },
})

// ── Forward modal ─────────────────────────────────────────────────────────────
function ForwardModal({ visible, onClose, connections, onForward, isDark }) {
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = '#8e8e93'
  const divider = isDark ? '#2c2c2e' : '#f2f2f7'

  return (
    <BottomSheet visible={visible} onClose={onClose} isDark={isDark}>
      <View style={menuS.headerRow}>
        <Text style={[infoS.title, { color: textColor }]}>Forward To</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle-outline" size={26} color={mutedColor} />
        </TouchableOpacity>
      </View>
      {connections.length === 0
        ? <Text style={{ color: mutedColor, textAlign: 'center', paddingVertical: 24, fontSize: 14 }}>
            No connections to forward to
          </Text>
        : connections.map((c, idx) => {
          const initials = (c.user.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          return (
            <TouchableOpacity
              key={c.connectionId}
              style={[menuS.item, idx < connections.length - 1 && { borderBottomWidth: 1, borderBottomColor: divider }]}
              onPress={() => onForward(c.user.id)}
              activeOpacity={0.7}
            >
              {c.user.profilePhotoUrl
                ? <Image source={{ uri: c.user.profilePhotoUrl }} style={fwdS.avatar} />
                : <View style={fwdS.avatarFb}><Text style={fwdS.avatarTxt}>{initials}</Text></View>
              }
              <View style={{ flex: 1 }}>
                <Text style={[fwdS.name, { color: textColor }]}>{c.user.fullName}</Text>
                <Text style={[fwdS.handle, { color: mutedColor }]}>@{c.user.username}</Text>
              </View>
              <Ionicons name="paper-plane-outline" size={18} color={ACCENT} />
            </TouchableOpacity>
          )
        })
      }
    </BottomSheet>
  )
}
const fwdS = StyleSheet.create({
  avatar:    { width: 44, height: 44, borderRadius: 22 },
  avatarFb:  { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  name:      { fontSize: 14.5, fontFamily: 'Poppins_600SemiBold' },
  handle:    { fontSize: 12, marginTop: 1 },
})

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { userId, partnerName, partnerUsername, partnerPhoto } = useLocalSearchParams()
  const router = useRouter()
  const myId = useSelector(state => state.user.user?.id)
  const token = useSelector(state => state.user.token)
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const insets = useSafeAreaInsets()

  const [messages,      setMessages]      = useState([])
  const [text,          setText]          = useState('')
  const [partner,       setPartner]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [connected,     setConnected]     = useState(null)
  const [selectedMsg,   setSelectedMsg]   = useState(null)
  const [menuVisible,   setMenuVisible]   = useState(false)
  const [infoVisible,   setInfoVisible]   = useState(false)
  const [forwardVisible,setForwardVisible]= useState(false)
  const [forwardingMsg, setForwardingMsg] = useState(null)
  const [connections,   setConnections]   = useState([])
  const [undoInfo,      setUndoInfo]      = useState(null)
  const [optionsVisible,setOptionsVisible]= useState(false)
  const undoTimerRef    = useRef(null)
  const socketRef       = useRef(null)
  const flatRef         = useRef(null)
  const pendingTempIds  = useRef([])

  // ── Swipe-to-reveal timestamps ─────────────────────────────────────────────
  // onStartShouldSetPanResponder: false — never claims on tap/press start,
  // so message long-press and tap still work normally.
  // Requires 30 px leftward AND 3× more horizontal than vertical.
  const swipeX = useRef(new Animated.Value(0)).current
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) =>
      gs.dx < -30 && Math.abs(gs.dx) > Math.abs(gs.dy) * 3,
    onPanResponderMove: (_, gs) => {
      if (gs.dx < 0) swipeX.setValue(Math.max(gs.dx, -72))
    },
    onPanResponderRelease: () => {
      Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 9, tension: 50 }).start()
    },
    onPanResponderTerminate: () => {
      Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 9, tension: 50 }).start()
    },
  })).current

  const timeOpacity = swipeX.interpolate({ inputRange: [-72, -20], outputRange: [1, 0], extrapolate: 'clamp' })

  const bg          = isDark ? '#0d0d0d' : '#f0f2f5'
  const inputBg     = isDark ? '#1c1c1e' : '#fff'
  const inputBorder = isDark ? '#2c2c2e' : '#e5e7eb'
  const textColor   = isDark ? '#f0f0f0' : '#111'
  const mutedColor  = isDark ? '#8e8e93' : '#aaa'

  // Use params immediately — no "..." lag; full profile replaces after fetch
  const displayName     = partner?.fullName       || partnerName     || ''
  const displayUsername = partner?.username        || partnerUsername || ''
  const displayPhoto    = partner?.profilePhotoUrl || (partnerPhoto ? decodeURIComponent(partnerPhoto) : null)
  const displayInitials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  useEffect(() => {
    Promise.all([
      getChatHistory(userId).then(d   => setMessages(d.messages || [])),
      getPlayerProfile(userId).then(d => setPartner(d.user)),
      getConnectionStatus(userId).then(d => setConnected(d.status === 'ACCEPTED')),
      getConnections().then(d         => setConnections(d.connections || [])),
    ]).finally(() => setLoading(false))

    const socket = io(API_BASE_URL, { auth: { token }, transports: ['websocket'] })
    socketRef.current = socket

    socket.on('new_message', (msg) => {
      if ((msg.fromId === userId && msg.toId === myId) || (msg.fromId === myId && msg.toId === userId)) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
      }
    })
    socket.on('message_sent', (msg) => {
      setMessages(prev => {
        const tempId = pendingTempIds.current.shift()
        const base = tempId ? prev.filter(m => m.id !== tempId) : prev
        return base.find(m => m.id === msg.id) ? base : [...base, msg]
      })
    })
    socket.on('messages_read', ({ byUserId }) => {
      if (byUserId === userId) {
        setMessages(prev => prev.map(m =>
          m.fromId === myId && m.status !== 'READ' ? { ...m, status: 'READ' } : m
        ))
      }
    })
    socket.emit('mark_read', { fromId: userId })

    return () => {
      socket.disconnect()
      if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null }
    }
  }, [userId, myId, token])

  const sendMessage = useCallback(() => {
    const content = text.trim()
    if (!content || !socketRef.current || !connected) return
    const tempId = `temp_${Date.now()}_${Math.random()}`
    pendingTempIds.current.push(tempId)
    setMessages(prev => [...prev, {
      id: tempId,
      fromId: myId,
      toId: userId,
      content,
      status: 'SENDING',
      createdAt: new Date().toISOString(),
    }])
    setText('')
    socketRef.current.emit('send_message', { toId: userId, content })
  }, [text, userId, connected, myId])

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 30)
  }, [messages.length])

  const handleLongPress = (msg) => { setSelectedMsg(msg); setMenuVisible(true) }

  const scheduleDelete = useCallback((msg, type) => {
    if (undoTimerRef.current && undoInfo) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
      const p = undoInfo
      if (p.type === 'forMe') deleteMessageForMe(p.message.id).catch(() => {})
      else deleteMessageForEveryone(p.message.id).catch(() => {})
    }
    setMessages(cur => cur.filter(m => m.id !== msg.id))
    setUndoInfo({ message: msg, type })
    undoTimerRef.current = setTimeout(() => {
      undoTimerRef.current = null
      setUndoInfo(null)
      const restore = () => setMessages(cur =>
        [...cur, msg].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      )
      if (type === 'forMe')       deleteMessageForMe(msg.id).catch(restore)
      else deleteMessageForEveryone(msg.id).catch(restore)
    }, 4000)
  }, [undoInfo])

  const handleDeleteForMe = useCallback(() => selectedMsg && scheduleDelete(selectedMsg, 'forMe'),        [selectedMsg, scheduleDelete])
  const handleUndoSend    = useCallback(() => selectedMsg && scheduleDelete(selectedMsg, 'forEveryone'),  [selectedMsg, scheduleDelete])

  const handleUndo = () => {
    if (!undoInfo || !undoTimerRef.current) return
    clearTimeout(undoTimerRef.current)
    undoTimerRef.current = null
    setMessages(cur => [...cur, undoInfo.message].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))
    setUndoInfo(null)
  }

  const handleForwardOpen = () => { setForwardingMsg(selectedMsg); setForwardVisible(true) }
  const handleForward = async (toId) => {
    setForwardVisible(false)
    if (!forwardingMsg) return
    try   { await forwardMessage(forwardingMsg.id, toId); Alert.alert('Forwarded', 'Message forwarded successfully') }
    catch { Alert.alert('Error', 'Failed to forward message') }
  }

  const handleClearChat = () => {
    setOptionsVisible(false)
    Alert.alert(
      'Clear Chat',
      'This will clear all messages in this chat for you. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const prev = messages
            setMessages([])
            try { await deleteConversation(userId) }
            catch { setMessages(prev) }
          },
        },
      ],
      { cancelable: true }
    )
  }

  // Instagram-style status: only below the LAST message sent by me
  const lastMyMsgId = messages.reduce((id, m) => m.fromId === myId ? m.id : id, null)

  const messageItems = useMemo(() => buildMessageItems(messages), [messages])

  const renderItem = ({ item }) => {
    if (item._type === 'separator') {
      return (
        <View style={styles.dateSepRow}>
          <View style={[styles.dateSepLine, { backgroundColor: isDark ? '#3a3a3c' : '#d1d1d6' }]} />
          <Text style={[styles.dateSepText, { color: isDark ? '#8e8e93' : '#aeaeb2' }]}>{item.label}</Text>
          <View style={[styles.dateSepLine, { backgroundColor: isDark ? '#3a3a3c' : '#d1d1d6' }]} />
        </View>
      )
    }

    const isMine    = item.fromId === myId
    const isDeleted = item.deletedForEveryone
    const bubbleBg  = isMine ? ACCENT : (isDark ? '#2c2c2e' : '#fff')
    const timeStr   = formatMsgTime(item.createdAt)

    // Status label shown only below the latest message I sent
    let statusLabel = null
    if (isMine && item.id === lastMyMsgId) {
      const ago = timeAgo(item.createdAt)
      if (!item.status || item.status === 'SENDING') statusLabel = 'Sending…'
      else if (item.status === 'SENT')      statusLabel = `Sent · ${ago}`
      else if (item.status === 'DELIVERED') statusLabel = `Delivered · ${ago}`
      else if (item.status === 'READ')      statusLabel = `Seen · ${ago}`
    }

    return (
      <View style={styles.msgRow}>
        {/* Animated bubble — slides left to reveal timestamp */}
        <Animated.View style={[
          styles.bubbleWrap,
          isMine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
          { transform: [{ translateX: swipeX }] },
        ]}>
          <TouchableOpacity
            activeOpacity={0.82}
            onLongPress={() => !isDeleted && handleLongPress(item)}
            delayLongPress={340}
            style={isMine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }}
          >
            <View style={[
              styles.bubble,
              { backgroundColor: bubbleBg },
              isMine ? styles.bubbleMine : styles.bubbleTheirs,
              !isMine && !isDark && styles.bubbleShadow,
            ]}>
              {item.forwardedFromId && !isDeleted && (
                <View style={styles.fwdLabel}>
                  <Ionicons name="arrow-redo-outline" size={10} color={isMine ? 'rgba(255,255,255,0.7)' : ACCENT} />
                  <Text style={[styles.fwdText, { color: isMine ? 'rgba(255,255,255,0.7)' : ACCENT }]}>Forwarded</Text>
                </View>
              )}
              <Text style={[
                styles.bubbleText,
                { color: isMine ? '#fff' : (isDark ? '#e8e8e8' : '#111') },
                isDeleted && styles.deletedText,
              ]}>
                {isDeleted ? 'This message was deleted' : item.content}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Instagram-style status — only below last my message */}
          {statusLabel && (
            <Text style={[styles.statusLabel, { color: mutedColor }]}>{statusLabel}</Text>
          )}
        </Animated.View>

        {/* Timestamp — RIGHT side, revealed by swipe only */}
        <Animated.Text style={[styles.swipeTime, { opacity: timeOpacity, color: mutedColor }]}>
          {timeStr}
        </Animated.Text>
      </View>
    )
  }

  const headerPt = Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 8

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: headerPt }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Avatar — tappable to view profile */}
        <TouchableOpacity onPress={() => router.push(`/player/${userId}`)} activeOpacity={0.8}>
          <View style={styles.headerAvatarWrap}>
            {displayPhoto
              ? <Image source={{ uri: displayPhoto }} style={styles.headerAvatarImg} />
              : (
                <View style={styles.headerAvatarFb}>
                  <Text style={styles.headerAvatarTxt}>{displayInitials}</Text>
                </View>
              )
            }
            <View style={styles.headerOnlineDot} />
          </View>
        </TouchableOpacity>

        {/* Name + username — tighter gap */}
        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/player/${userId}`)} activeOpacity={0.8}>
          <Text style={styles.headerName} numberOfLines={1}>{displayName || 'Loading…'}</Text>
          {displayUsername ? (
            <Text style={styles.headerHandle}>@{displayUsername}</Text>
          ) : null}
        </TouchableOpacity>

        {/* Challenge + more options */}
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.push(`/create-match?challengeUserId=${userId}`)}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        >
          <Ionicons name="trophy-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setOptionsVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading
        ? <View style={styles.centered}><ActivityIndicator size="large" color={ACCENT} /></View>
        : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior='padding' keyboardVerticalOffset={0}>
            {connected === false && (
              <View style={[styles.notConnBanner, { backgroundColor: isDark ? '#2c2c2e' : '#fff3cd' }]}>
                <Ionicons name="people-outline" size={17} color={ACCENT} />
                <Text style={[styles.notConnText, { color: isDark ? '#ccc' : '#856404' }]}>
                  Connect with this player to send messages
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }} {...panResponder.panHandlers}>
              <FlatList
                ref={flatRef}
                data={messageItems}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <View style={styles.emptyIconBg}>
                      <Ionicons name="chatbubble-ellipses-outline" size={36} color={ACCENT} />
                    </View>
                    <Text style={[styles.emptyText, { color: isDark ? '#555' : '#bbb' }]}>
                      {connected ? 'Say hi! 👋' : 'Connect first to chat'}
                    </Text>
                  </View>
                }
              />
            </View>

            {connected !== false && (
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderTopColor: inputBorder }]}>
                <TextInput
                  style={[styles.input, {
                    color: textColor,
                    backgroundColor: isDark ? '#2a2a2c' : '#f5f5f7',
                    borderColor: isDark ? '#3c3c3e' : '#dde0e4',
                  }]}
                  placeholder="Message…"
                  placeholderTextColor={mutedColor}
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { opacity: text.trim() ? 1 : 0.32 }]}
                  onPress={sendMessage}
                  disabled={!text.trim()}
                  activeOpacity={0.75}
                >
                  <Ionicons name="send" size={17} color="#fff" style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        )
      }

      {/* Undo snackbar */}
      {undoInfo && (
        <View style={styles.undoBar}>
          <Ionicons name="trash-outline" size={15} color="#aaa" style={{ marginRight: 8 }} />
          <Text style={styles.undoText}>Message removed</Text>
          <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
            <Text style={styles.undoBtnText}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* More options sheet */}
      <BottomSheet visible={optionsVisible} onClose={() => setOptionsVisible(false)} isDark={isDark}>
        {[
          {
            label: 'Clear Chat',
            icon: 'trash-bin-outline',
            color: '#ef4444',
            onPress: handleClearChat,
          },
          {
            label: 'Report',
            icon: 'flag-outline',
            color: isDark ? '#f0f0f0' : '#111',
            onPress: () => {
              setOptionsVisible(false)
              Alert.alert('Report', 'Report sent. Our team will review this conversation.')
            },
          },
          {
            label: 'Block',
            icon: 'ban-outline',
            color: '#f97316',
            onPress: () => {
              setOptionsVisible(false)
              Alert.alert('Block User', `Block ${displayName}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Block', style: 'destructive', onPress: () => Alert.alert('Blocked', `${displayName} has been blocked.`) },
              ])
            },
          },
        ].map((opt, idx, arr) => (
          <TouchableOpacity
            key={opt.label}
            style={[
              menuS.item,
              idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? '#2c2c2e' : '#f2f2f7' },
            ]}
            onPress={opt.onPress}
            activeOpacity={0.65}
          >
            <View style={[menuS.iconWrap, { backgroundColor: opt.color + '18' }]}>
              <Ionicons name={opt.icon} size={20} color={opt.color} />
            </View>
            <Text style={[menuS.itemText, { color: opt.color }]}>{opt.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={isDark ? '#3a3a3c' : '#d1d1d6'} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </BottomSheet>

      <MessageMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        message={selectedMsg}
        myId={myId}
        isDark={isDark}
        onDeleteForMe={handleDeleteForMe}
        onUndoSend={handleUndoSend}
        onForward={handleForwardOpen}
        onInfo={() => setInfoVisible(true)}
      />
      <MessageInfoModal
        visible={infoVisible}
        onClose={() => setInfoVisible(false)}
        message={selectedMsg}
        isDark={isDark}
      />
      <ForwardModal
        visible={forwardVisible}
        onClose={() => setForwardVisible(false)}
        connections={connections.filter(c => c.user.id !== userId)}
        onForward={handleForward}
        isDark={isDark}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ──
  header: {
    backgroundColor: ACCENT,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 12, gap: 10,
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6,
  },
  headerAvatarWrap: { position: 'relative' },
  headerAvatarImg: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.45)',
  },
  headerAvatarFb: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarTxt: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  headerOnlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: GREEN, borderWidth: 2.5, borderColor: ACCENT,
  },
  headerName:   { color: '#fff', fontSize: 15.5, fontFamily: 'Poppins_600SemiBold', lineHeight: 19 },
  headerHandle: { color: 'rgba(255,255,255,0.72)', fontSize: 11.5, lineHeight: 15, marginTop: 0 },
  headerIconBtn: { padding: 4 },

  // ── Not connected banner ──
  notConnBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  notConnText: { fontSize: 13, fontFamily: 'Poppins_500Medium', flex: 1 },

  // ── Message list ──
  list:       { padding: 12, paddingBottom: 12 },
  emptyWrap:  { alignItems: 'center', paddingTop: 70 },
  emptyIconBg: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: ACCENT + '12',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  emptyText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },

  // ── Date separator ──
  dateSepRow: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 12, paddingHorizontal: 4,
  },
  dateSepLine: { flex: 1, height: 1 },
  dateSepText: {
    fontSize: 11, fontFamily: 'Poppins_500Medium',
    marginHorizontal: 10,
  },

  // ── Message rows ──
  msgRow: {
    marginBottom: 7,
    position: 'relative',
    minHeight: 36,
  },
  bubbleWrap: { maxWidth: '78%' },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 13, paddingTop: 9, paddingBottom: 9,
  },
  bubbleMine:   { borderBottomRightRadius: 4 },
  bubbleTheirs: { borderBottomLeftRadius: 4 },
  bubbleShadow: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.09, shadowRadius: 3, elevation: 2,
  },
  bubbleText:  { fontSize: 14.5, lineHeight: 21 },
  deletedText: { fontStyle: 'italic', opacity: 0.55 },
  fwdLabel:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 5 },
  fwdText:     { fontSize: 10, fontFamily: 'Poppins_500Medium' },

  // Instagram-style status below last my message
  statusLabel: {
    alignSelf: 'flex-end',
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    marginTop: 3,
    marginRight: 2,
  },

  // Timestamp RIGHT side — only visible when swiping left
  swipeTime: {
    position: 'absolute',
    right: 8, bottom: 9,
    fontSize: 10.5,
    fontFamily: 'Poppins_400Regular',
  },

  // ── Input ──
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14.5, maxHeight: 110,
    borderWidth: 1.5,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center',
    elevation: 3,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.38, shadowRadius: 5,
  },

  // ── Undo snackbar ──
  undoBar: {
    position: 'absolute', bottom: 80, left: 16, right: 16,
    backgroundColor: '#1c1c1e', borderRadius: 12,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.38, shadowRadius: 8,
  },
  undoText:    { color: '#e5e5ea', fontSize: 13.5, flex: 1 },
  undoBtn:     { paddingHorizontal: 10, paddingVertical: 4 },
  undoBtnText: { color: ACCENT, fontSize: 13, fontFamily: 'Poppins_700Bold', letterSpacing: 0.5 },
})
