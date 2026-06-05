import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  View, Text as RNText, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
  Modal, TouchableWithoutFeedback, Alert, Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import {
  getChatHistory, getPlayerProfile, getConnectionStatus,
  deleteMessageForMe, deleteMessageForEveryone, forwardMessage, getConnections,
  API_BASE_URL,
} from '../services/api'

const ACCENT = '#C8102E'
const BLUE = '#2196F3'

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

function HalfCircle({ color }) {
  return (
    <View style={{ width: 7, height: 12, overflow: 'hidden' }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
    </View>
  )
}

function MessageStatusIcon({ status, isMine }) {
  if (!isMine) return null
  if (status === 'SENDING') return <ActivityIndicator size={10} color="rgba(255,255,255,0.6)" style={{ marginLeft: 4 }} />
  if (status === 'SENT') return <View style={{ marginLeft: 4 }}><HalfCircle color="rgba(255,255,255,0.5)" /></View>
  if (status === 'DELIVERED') return <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.5)', marginLeft: 4 }} />
  if (status === 'READ') return <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: BLUE, marginLeft: 4 }} />
  return null
}

function ForwardModal({ visible, onClose, connections, onForward }) {
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const bg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#999'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>
      <View style={[styles.forwardSheet, { backgroundColor: bg }]}>
        <Text style={[styles.forwardTitle, { color: textColor }]}>Forward to</Text>
        {connections.length === 0
          ? <Text style={[styles.forwardEmpty, { color: mutedColor }]}>No connections yet</Text>
          : connections.map(c => {
            const initials = (c.user.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            return (
              <TouchableOpacity key={c.connectionId} style={styles.forwardItem} onPress={() => onForward(c.user.id)}>
                {c.user.profilePhotoUrl
                  ? <Image source={{ uri: c.user.profilePhotoUrl }} style={styles.forwardAvatar} />
                  : <View style={styles.forwardAvatarFallback}><Text style={styles.forwardAvatarText}>{initials}</Text></View>
                }
                <View>
                  <Text style={[styles.forwardName, { color: textColor }]}>{c.user.fullName}</Text>
                  <Text style={[styles.forwardHandle, { color: mutedColor }]}>@{c.user.username}</Text>
                </View>
              </TouchableOpacity>
            )
          })
        }
      </View>
    </Modal>
  )
}

function MessageMenu({ visible, onClose, message, myId, isDark, onDeleteForMe, onDeleteForEveryone, onForward }) {
  if (!visible) return null
  const bg = isDark ? '#2a2a2a' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const isMine = message?.fromId === myId

  const options = [
    { label: 'Forward', icon: 'arrow-redo-outline', onPress: onForward, color: textColor },
    { label: 'Delete for Me', icon: 'trash-outline', onPress: onDeleteForMe, color: '#ef4444' },
    ...(isMine ? [{ label: 'Delete for Everyone', icon: 'close-circle-outline', onPress: onDeleteForEveryone, color: '#ef4444' }] : []),
  ]

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>
      <View style={[styles.menuSheet, { backgroundColor: bg }]}>
        {options.map(opt => (
          <TouchableOpacity key={opt.label} style={styles.menuItem} onPress={() => { onClose(); opt.onPress() }}>
            <Ionicons name={opt.icon} size={20} color={opt.color} />
            <Text style={[styles.menuItemText, { color: opt.color }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  )
}

export default function ChatScreen() {
  const { userId } = useLocalSearchParams()
  const router = useRouter()
  const myId = useSelector(state => state.user.user?.id)
  const token = useSelector(state => state.user.token)
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [partner, setPartner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(null)
  const [selectedMsg, setSelectedMsg] = useState(null)
  const [menuVisible, setMenuVisible] = useState(false)
  const [forwardVisible, setForwardVisible] = useState(false)
  const [forwardingMsg, setForwardingMsg] = useState(null)
  const [connections, setConnections] = useState([])
  // Undo delete state
  const [undoInfo, setUndoInfo] = useState(null) // { message, type }
  const undoTimerRef = useRef(null)

  const socketRef = useRef(null)
  const flatRef = useRef(null)

  const bg = isDark ? '#111' : '#f8f9fa'
  const inputBg = isDark ? '#1e1e1e' : '#fff'
  const inputBorder = isDark ? '#2a2a2a' : '#e5e7eb'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#555' : '#bbb'

  useEffect(() => {
    Promise.all([
      getChatHistory(userId).then(d => setMessages(d.messages || [])),
      getPlayerProfile(userId).then(d => setPartner(d.user)),
      getConnectionStatus(userId).then(d => setConnected(d.status === 'ACCEPTED')),
      getConnections().then(d => setConnections(d.connections || [])),
    ]).finally(() => setLoading(false))

    const socket = io(API_BASE_URL, { auth: { token }, transports: ['websocket'] })
    socketRef.current = socket

    socket.on('new_message', (msg) => {
      if ((msg.fromId === userId && msg.toId === myId) || (msg.fromId === myId && msg.toId === userId)) {
        setMessages(prev => {
          const exists = prev.find(m => m.id === msg.id)
          return exists ? prev : [...prev, msg]
        })
      }
    })

    // Replace placeholder or just add — no optimistic insert, so just add if not exists
    socket.on('message_sent', (msg) => {
      setMessages(prev => {
        const exists = prev.find(m => m.id === msg.id)
        return exists ? prev : [...prev, msg]
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
      // Flush any pending undo deletes on unmount
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
        undoTimerRef.current = null
      }
    }
  }, [userId, myId, token])

  const sendMessage = useCallback(() => {
    const content = text.trim()
    if (!content || !socketRef.current || !connected) return
    // No optimistic insert — message_sent callback adds it
    socketRef.current.emit('send_message', { toId: userId, content })
    setText('')
  }, [text, userId, connected])

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80)
  }, [messages.length])

  const handleLongPress = (msg) => {
    setSelectedMsg(msg)
    setMenuVisible(true)
  }

  // Optimistic delete with undo
  const scheduleDelete = useCallback((msg, type) => {
    // If another undo is pending, flush it immediately
    if (undoTimerRef.current && undoInfo) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
      const prev = undoInfo
      if (prev.type === 'forMe') deleteMessageForMe(prev.message.id).catch(() => {})
      else deleteMessageForEveryone(prev.message.id).catch(() => {})
    }

    // Optimistically remove from UI
    setMessages(cur => cur.filter(m => m.id !== msg.id))

    // Set undo window
    setUndoInfo({ message: msg, type })
    undoTimerRef.current = setTimeout(() => {
      undoTimerRef.current = null
      setUndoInfo(null)
      if (type === 'forMe') {
        deleteMessageForMe(msg.id).catch(() => {
          setMessages(cur => [...cur, msg].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))
        })
      } else {
        deleteMessageForEveryone(msg.id).catch(() => {
          setMessages(cur => [...cur, msg].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))
        })
      }
    }, 3000)
  }, [undoInfo])

  const handleDeleteForMe = useCallback(() => {
    if (!selectedMsg) return
    scheduleDelete(selectedMsg, 'forMe')
  }, [selectedMsg, scheduleDelete])

  const handleDeleteForEveryone = useCallback(() => {
    if (!selectedMsg) return
    scheduleDelete(selectedMsg, 'forEveryone')
  }, [selectedMsg, scheduleDelete])

  const handleUndo = () => {
    if (!undoInfo || !undoTimerRef.current) return
    clearTimeout(undoTimerRef.current)
    undoTimerRef.current = null
    setMessages(cur => [...cur, undoInfo.message].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))
    setUndoInfo(null)
  }

  const handleForwardOpen = () => {
    setForwardingMsg(selectedMsg)
    setForwardVisible(true)
  }

  const handleForward = async (toId) => {
    setForwardVisible(false)
    if (!forwardingMsg) return
    try {
      await forwardMessage(forwardingMsg.id, toId)
      Alert.alert('Forwarded', 'Message forwarded successfully')
    } catch {
      Alert.alert('Error', 'Failed to forward message')
    }
  }

  const renderItem = ({ item }) => {
    const isMine = item.fromId === myId
    const isDeleted = item.deletedForEveryone

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => !isDeleted && handleLongPress(item)}
        delayLongPress={350}
      >
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {item.forwardedFromId && !isDeleted && (
            <View style={styles.forwardedLabel}>
              <Ionicons name="arrow-redo-outline" size={11} color={isMine ? 'rgba(255,255,255,0.7)' : ACCENT} />
              <Text style={[styles.forwardedText, { color: isMine ? 'rgba(255,255,255,0.7)' : ACCENT }]}>Forwarded</Text>
            </View>
          )}
          <Text style={[
            styles.bubbleText,
            isMine ? styles.bubbleTextMine : { color: isDark ? '#fff' : '#111' },
            isDeleted && styles.deletedText,
          ]}>
            {isDeleted ? 'This message was deleted' : item.content}
          </Text>
          <View style={styles.bubbleMeta}>
            <Text style={[styles.bubbleTime, isMine ? { color: 'rgba(255,255,255,0.6)' } : { color: mutedColor }]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <MessageStatusIcon status={item.status || 'SENT'} isMine={isMine} />
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{partner?.fullName || '...'}</Text>
          <Text style={styles.headerHandle}>@{partner?.username || ''}</Text>
        </View>
      </View>

      {loading
        ? <View style={styles.centered}><ActivityIndicator size="large" color={ACCENT} /></View>
        : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
            {connected === false && (
              <View style={[styles.notConnectedBanner, { backgroundColor: isDark ? '#2a2a2a' : '#fff3cd' }]}>
                <Ionicons name="people-outline" size={18} color={ACCENT} />
                <Text style={[styles.notConnectedText, { color: isDark ? '#ccc' : '#856404' }]}>
                  Connect with this player to send messages
                </Text>
              </View>
            )}
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                  <Text style={[styles.emptyText, { color: isDark ? '#555' : '#ccc' }]}>
                    {connected ? 'Start the conversation!' : 'Connect first to start chatting'}
                  </Text>
                </View>
              }
            />
            {connected !== false && (
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderTopColor: inputBorder }]}>
                <TextInput
                  style={[styles.input, { color: textColor, backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}
                  placeholder="Type a message..."
                  placeholderTextColor={isDark ? '#555' : '#bbb'}
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}
                  onPress={sendMessage}
                  disabled={!text.trim()}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        )
      }

      {/* Undo snackbar */}
      {undoInfo && (
        <View style={styles.undoBar}>
          <Text style={styles.undoText}>Message deleted</Text>
          <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
            <Text style={styles.undoBtnText}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}

      <MessageMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        message={selectedMsg}
        myId={myId}
        isDark={isDark}
        onDeleteForMe={handleDeleteForMe}
        onDeleteForEveryone={handleDeleteForEveryone}
        onForward={handleForwardOpen}
      />

      <ForwardModal
        visible={forwardVisible}
        onClose={() => setForwardVisible(false)}
        connections={connections.filter(c => c.user.id !== userId)}
        onForward={handleForward}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: ACCENT, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12, gap: 12,
  },
  headerInfo: { flex: 1 },
  headerName: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  headerHandle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  notConnectedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  notConnectedText: { fontSize: 13, fontFamily: 'Poppins_500Medium', flex: 1 },
  list: { padding: 12, paddingBottom: 8 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, marginTop: 10, fontFamily: 'Poppins_500Medium' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  bubbleMine: { backgroundColor: ACCENT, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: 'rgba(0,0,0,0.07)', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  deletedText: { fontStyle: 'italic', opacity: 0.6 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  bubbleTime: { fontSize: 10 },
  forwardedLabel: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  forwardedText: { fontSize: 10, fontFamily: 'Poppins_500Medium' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1,
  },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  // Undo snackbar
  undoBar: {
    position: 'absolute', bottom: 80, left: 16, right: 16,
    backgroundColor: '#323232', borderRadius: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  undoText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_400Regular' },
  undoBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  undoBtnText: { color: ACCENT, fontSize: 13, fontFamily: 'Poppins_700Bold', letterSpacing: 0.5 },
  // Message menu
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  menuSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, paddingTop: 16, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 16,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  menuItemText: { fontSize: 15, fontFamily: 'Poppins_500Medium' },
  // Forward modal
  forwardSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, paddingTop: 16, paddingHorizontal: 16,
    maxHeight: '70%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 16,
  },
  forwardTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: 16, textAlign: 'center' },
  forwardEmpty: { textAlign: 'center', fontSize: 14, paddingVertical: 20 },
  forwardItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  forwardAvatar: { width: 44, height: 44, borderRadius: 22 },
  forwardAvatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  forwardAvatarText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  forwardName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  forwardHandle: { fontSize: 12, marginTop: 1 },
})
