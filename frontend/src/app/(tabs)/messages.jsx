import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text as RNText, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useRouter } from 'expo-router'
import { getConversations, deleteConversation } from '../../services/api'

const ACCENT = '#C8102E'
function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
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

  const preview = lastMessage?.deletedForEveryone
    ? 'This message was deleted'
    : lastMessage?.content || ''

  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: cardBg }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        {user.profilePhotoUrl
          ? <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatar} />
          : <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
        }
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemRow}>
          <Text style={[styles.itemName, { color: textColor }]} numberOfLines={1}>{user.fullName}</Text>
          <Text style={[styles.itemTime, { color: mutedColor }]}>
            {lastMessage ? timeLabel(lastMessage.createdAt) : ''}
          </Text>
        </View>
        <View style={styles.itemRow}>
          <Text
            style={[
              styles.itemPreview,
              { color: unreadCount > 0 ? textColor : mutedColor, fontFamily: unreadCount > 0 ? 'Poppins_600SemiBold' : 'Poppins_400Regular' }
            ]}
            numberOfLines={1}
          >
            {isMine ? `You: ${preview}` : preview}
          </Text>
          {unreadCount > 0 && (
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
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const myId = useSelector(state => state.user.user?.id)
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()

  const bg = isDark ? '#111' : '#f8f9fa'
  const textColor = isDark ? '#fff' : '#111'

  const load = useCallback(async () => {
    try {
      const data = await getConversations()
      setConversations(data.conversations || [])
    } catch {
      setConversations([])
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
            // Optimistic remove
            setConversations(prev => prev.filter(c => c.user.id !== item.user.id))
            try {
              await deleteConversation(item.user.id)
            } catch {
              // Restore on failure
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
      <FlatList
        data={conversations}
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
            <Ionicons name="chatbubbles-outline" size={56} color={isDark ? '#333' : '#ddd'} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>No messages yet</Text>
            <Text style={[styles.emptyHint, { color: isDark ? '#555' : '#bbb' }]}>
              Connect with players to start chatting
            </Text>
          </View>
        }
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : styles.listContent}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyWrap: { alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontFamily: 'Poppins_600SemiBold', marginTop: 16 },
  emptyHint: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { width: 52, height: 52, borderRadius: 26, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold' },
  itemContent: { flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  itemName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', flex: 1, marginRight: 8 },
  itemTime: { fontSize: 11 },
  itemPreview: { fontSize: 13, flex: 1, marginRight: 8 },
  badge: { backgroundColor: ACCENT, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_700Bold' },
  separator: { height: 1, marginLeft: 80 },
})
