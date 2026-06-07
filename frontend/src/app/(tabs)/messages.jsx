import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text as RNText, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Alert,
  TextInput as RNTextInput, Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useRouter, useFocusEffect } from 'expo-router'
import { io } from 'socket.io-client'
import { getConversations, deleteConversation, API_BASE_URL } from '../../services/api'

const ACCENT = '#C8102E'
const GREEN = '#25D366'

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}
function TextInput(props) {
  return <RNTextInput {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

function timeLabel(dateStr) {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = now - d
  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 604800000) {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
  }
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' })
}

// ── Conversation card ─────────────────────────────────────────────────────────
function ConversationItem({ item, myId, isDark, onPress, onLongPress }) {
  const { user, lastMessage, unreadCount } = item
  const initials = (user.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const cardBg = isDark ? '#1c1c1e' : '#fff'
  const textColor = isDark ? '#f0f0f0' : '#111'
  const mutedColor = isDark ? '#8e8e93' : '#aeaeb2'
  const isMine = lastMessage?.fromId === myId
  const hasUnread = unreadCount > 0

  const preview = lastMessage?.deletedForEveryone
    ? 'Message was deleted'
    : lastMessage?.content || 'Start a conversation'

  const scaleAnim = useRef(new Animated.Value(1)).current
  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 10 }).start()
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start()

  return (
    <Animated.View style={[
      styles.cardWrap,
      { backgroundColor: cardBg },
      isDark && styles.cardWrapDark,
    ]}>
      <TouchableOpacity
        style={styles.item}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        delayLongPress={420}
        activeOpacity={1}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {user.profilePhotoUrl
            ? <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatar} />
            : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )
          }
          {hasUnread && <View style={styles.newMsgDot} />}
        </View>

        {/* Content */}
        <View style={styles.itemContent}>
          <View style={styles.itemTopRow}>
            <Text
              style={[
                styles.itemName,
                { color: textColor },
                hasUnread && { fontFamily: 'Poppins_700Bold', color: isDark ? '#fff' : '#000' },
              ]}
              numberOfLines={1}
            >
              {user.fullName}
            </Text>
            <Text style={[
              styles.itemTime,
              { color: hasUnread ? ACCENT : mutedColor },
              hasUnread && { fontFamily: 'Poppins_600SemiBold' },
            ]}>
              {lastMessage ? timeLabel(lastMessage.createdAt) : ''}
            </Text>
          </View>

          <View style={styles.itemBotRow}>
            <Text
              style={[
                styles.itemPreview,
                { color: hasUnread ? (isDark ? '#e0e0e0' : '#333') : mutedColor },
                hasUnread && { fontFamily: 'Poppins_500Medium', marginRight: 8 },
              ]}
              numberOfLines={1}
            >
              {isMine ? `You: ${preview}` : preview}
            </Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const [conversations, setConversations] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const myId = useSelector(state => state.user.user?.id)
  const token = useSelector(state => state.user.token)
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()

  const bg = isDark ? '#111' : '#f0f2f5'
  const textColor = isDark ? '#f0f0f0' : '#111'
  const mutedColor = isDark ? '#8e8e93' : '#aeaeb2'
  const searchBg = isDark ? '#1c1c1e' : '#fff'

  const applySearch = useCallback((list, q) => {
    if (!q.trim()) return list
    const lq = q.toLowerCase()
    return list.filter(c =>
      c.user.fullName?.toLowerCase().includes(lq) ||
      c.user.username?.toLowerCase().includes(lq)
    )
  }, [])

  const load = useCallback(async (quiet = false) => {
    try {
      const data = await getConversations()
      const list = data.conversations || []
      setConversations(list)
      setFiltered(applySearch(list, search))
    } catch {
      setConversations([])
      setFiltered([])
    } finally {
      if (!quiet) setLoading(false)
      else setLoading(false)
    }
  }, [search, applySearch])

  useEffect(() => { load() }, [])

  // Reload every time this tab gains focus (catches messages sent from ChatScreen)
  useFocusEffect(
    useCallback(() => {
      load(true)
    }, [load])
  )

  // Real-time socket while on this tab
  useEffect(() => {
    if (!token || !myId) return
    const socket = io(API_BASE_URL, { auth: { token }, transports: ['websocket'] })
    socket.on('new_message', (msg) => {
      const otherId = msg.fromId === myId ? msg.toId : msg.fromId
      setConversations(prev => {
        const idx = prev.findIndex(c => c.user.id === otherId)
        if (idx === -1) { load(true); return prev }
        const updated = [...prev]
        const conv = { ...updated[idx], lastMessage: msg }
        if (msg.fromId !== myId) conv.unreadCount = (conv.unreadCount || 0) + 1
        updated.splice(idx, 1)
        updated.unshift(conv)
        return updated
      })
    })
    return () => socket.disconnect()
  }, [token, myId])

  useEffect(() => {
    setFiltered(applySearch(conversations, search))
  }, [conversations, search, applySearch])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleSearch = (t) => {
    setSearch(t)
    setFiltered(applySearch(conversations, t))
  }

  const handleLongPress = (item) => {
    Alert.alert(
      item.user.fullName,
      'Choose an action',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Chat',
          style: 'destructive',
          onPress: async () => {
            const updated = conversations.filter(c => c.user.id !== item.user.id)
            setConversations(updated)
            setFiltered(applySearch(updated, search))
            try { await deleteConversation(item.user.id) } catch { load() }
          },
        },
      ],
      { cancelable: true }
    )
  }

  // Navigate with partner data pre-loaded so ChatScreen header is instant
  const openChat = (item) => {
    router.push({
      pathname: `/chat/${item.user.id}`,
      params: {
        partnerName: item.user.fullName || '',
        partnerUsername: item.user.username || '',
        partnerPhoto: item.user.profilePhotoUrl || '',
      },
    })
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    )
  }

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0)

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: searchBg, borderBottomColor: isDark ? '#2c2c2e' : '#e8e8e8' }]}>
        <View style={styles.topBarInner}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.topBarTitle, { color: textColor }]}>Messages</Text>
            {totalUnread > 0 && (
              <Text style={[styles.topBarSub, { color: ACCENT }]}>{totalUnread} unread</Text>
            )}
          </View>
          <TouchableOpacity style={styles.composeBtn} onPress={() => router.push('/search')} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={[styles.searchRow, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
          <Ionicons name="search-outline" size={15} color={mutedColor} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search…"
            placeholderTextColor={mutedColor}
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={mutedColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.user.id}
        renderItem={({ item }) => (
          <ConversationItem
            item={item}
            myId={myId}
            isDark={isDark}
            onPress={() => openChat(item)}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="chatbubbles-outline" size={38} color={ACCENT} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>
              {search ? 'No results' : 'No messages yet'}
            </Text>
            <Text style={[styles.emptyHint, { color: mutedColor }]}>
              {search ? `Nothing matched "${search}"` : 'Find players and start chatting'}
            </Text>
            {!search && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/search')} activeOpacity={0.85}>
                <Ionicons name="person-add-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyBtnText}>Find Players</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Top bar ──
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  topBarInner: { flexDirection: 'row', alignItems: 'center' },
  topBarTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', lineHeight: 28 },
  topBarSub: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  composeBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: ACCENT,
    justifyContent: 'center', alignItems: 'center',
    elevation: 3,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.38, shadowRadius: 5,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

  // ── List ──
  listContent: { paddingTop: 10, paddingBottom: 20, paddingHorizontal: 10, gap: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },

  // ── Card wrap (border-radius + border-left) ──
  cardWrap: {
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: ACCENT,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  cardWrapDark: {
    shadowOpacity: 0.22,
    shadowColor: '#000',
  },

  // ── Conversation item ──
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarFallback: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold' },
  newMsgDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: GREEN,
    borderWidth: 2.5, borderColor: '#fff',
  },
  itemContent: { flex: 1, gap: 3 },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemBotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemName: { fontSize: 14.5, fontFamily: 'Poppins_600SemiBold', flex: 1, marginRight: 8 },
  itemTime: { fontSize: 11, fontFamily: 'Poppins_400Regular' },
  itemPreview: { fontSize: 12.5, flex: 1 },
  badge: {
    backgroundColor: ACCENT, borderRadius: 11,
    minWidth: 21, height: 21,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontFamily: 'Poppins_700Bold' },

  // ── Empty state ──
  emptyWrap: { alignItems: 'center' },
  emptyIconBg: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: ACCENT + '14',
    justifyContent: 'center', alignItems: 'center', marginBottom: 18,
  },
  emptyTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', marginBottom: 6 },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 11,
    backgroundColor: ACCENT, borderRadius: 22,
    elevation: 3,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6,
  },
  emptyBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
})
