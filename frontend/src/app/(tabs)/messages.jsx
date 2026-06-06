import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text as RNText, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Alert,
  TextInput as RNTextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useRouter } from 'expo-router'
import { getConversations, deleteConversation } from '../../services/api'

const ACCENT = '#C8102E'

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
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 604800000) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[d.getDay()]
  }
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' })
}

function ConversationItem({ item, myId, isDark, onPress, onLongPress }) {
  const { user, lastMessage, unreadCount } = item
  const initials = (user.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#999'
  const isMine = lastMessage?.fromId === myId
  const hasUnread = unreadCount > 0

  const preview = lastMessage?.deletedForEveryone
    ? 'This message was deleted'
    : lastMessage?.content || ''

  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: cardBg }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.75}
    >
      <View style={styles.avatarWrap}>
        {user.profilePhotoUrl
          ? <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatar} />
          : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )
        }
        {hasUnread && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemRow}>
          <Text
            style={[styles.itemName, { color: textColor, fontFamily: hasUnread ? 'Poppins_700Bold' : 'Poppins_600SemiBold' }]}
            numberOfLines={1}
          >
            {user.fullName}
          </Text>
          <Text style={[styles.itemTime, { color: hasUnread ? ACCENT : mutedColor, fontFamily: hasUnread ? 'Poppins_600SemiBold' : 'Poppins_400Regular' }]}>
            {lastMessage ? timeLabel(lastMessage.createdAt) : ''}
          </Text>
        </View>
        <View style={styles.itemRow}>
          <Text
            style={[
              styles.itemPreview,
              {
                color: hasUnread ? (isDark ? '#fff' : '#333') : mutedColor,
                fontFamily: hasUnread ? 'Poppins_500Medium' : 'Poppins_400Regular',
              },
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
  )
}

export default function MessagesScreen() {
  const [conversations, setConversations] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const myId = useSelector(state => state.user.user?.id)
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()

  const bg = isDark ? '#111' : '#efefef'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#555' : '#999'

  const load = useCallback(async () => {
    try {
      const data = await getConversations()
      const list = data.conversations || []
      setConversations(list)
      setFiltered(list)
    } catch {
      setConversations([])
      setFiltered([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleSearch = (text) => {
    setSearch(text)
    if (!text.trim()) {
      setFiltered(conversations)
    } else {
      const q = text.toLowerCase()
      setFiltered(conversations.filter(c =>
        c.user.fullName?.toLowerCase().includes(q) ||
        c.user.username?.toLowerCase().includes(q)
      ))
    }
  }

  const handleDeleteChat = (item) => {
    Alert.alert(
      'Delete Chat',
      `Delete conversation with ${item.user.fullName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = conversations.filter(c => c.user.id !== item.user.id)
            setConversations(updated)
            setFiltered(updated.filter(c =>
              !search.trim() ||
              c.user.fullName?.toLowerCase().includes(search.toLowerCase()) ||
              c.user.username?.toLowerCase().includes(search.toLowerCase())
            ))
            try {
              await deleteConversation(item.user.id)
            } catch {
              load()
            }
          },
        },
      ],
      { cancelable: true }
    )
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: bg }]}>
        <View style={[styles.searchRow, { backgroundColor: cardBg, borderColor: isDark ? '#2a2a2a' : '#e8e8e8' }]}>
          <Ionicons name="search-outline" size={18} color={ACCENT} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search conversations..."
            placeholderTextColor={mutedColor}
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#bbb" />
            </TouchableOpacity>
          )}
        </View>
        {conversations.length > 0 && (
          <Text style={[styles.convCount, { color: mutedColor }]}>
            {filtered.length} {filtered.length === 1 ? 'conversation' : 'conversations'}
          </Text>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.user.id}
        renderItem={({ item }) => (
          <ConversationItem
            item={item}
            myId={myId}
            isDark={isDark}
            onPress={() => router.push(`/chat/${item.user.id}`)}
            onLongPress={() => handleDeleteChat(item)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="chatbubbles-outline" size={32} color={ACCENT} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>
              {search ? 'No results found' : 'No messages yet'}
            </Text>
            <Text style={[styles.emptyHint, { color: isDark ? '#555' : '#bbb' }]}>
              {search
                ? `No conversations matching "${search}"`
                : 'Connect with players to start chatting'
              }
            </Text>
            {!search && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/search')}>
                <Text style={styles.emptyBtnText}>Find Players</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]} />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Search bar ──
  searchWrap: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  convCount: {
    fontSize: 11,
    marginTop: 6,
    marginLeft: 2,
  },

  // ── List ──
  listContent: { paddingBottom: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },

  // ── Conversation item ──
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: ACCENT,
    borderWidth: 2, borderColor: '#fff',
  },
  itemContent: { flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  itemName: { fontSize: 14.5, flex: 1, marginRight: 8 },
  itemTime: { fontSize: 11 },
  itemPreview: { fontSize: 12.5, flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: ACCENT, borderRadius: 10,
    minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_700Bold' },
  separator: { height: 1, marginLeft: 82 },

  // ── Empty state ──
  emptyWrap: { alignItems: 'center' },
  emptyIconBg: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: ACCENT + '12',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', marginBottom: 6 },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: ACCENT,
    borderRadius: 22,
  },
  emptyBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13, marginBottom: -2 },
})
