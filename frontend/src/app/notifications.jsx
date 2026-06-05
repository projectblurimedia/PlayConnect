import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text as RNText, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, StatusBar, Platform, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useRouter } from 'expo-router'
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
  acceptConnection, rejectConnection,
} from '../services/api'

const ACCENT = '#C8102E'
function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

function timeLabel(dateStr) {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = now - d
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' })
}

function NotifIcon({ type }) {
  if (type === 'CONNECTION_REQUEST') return <Ionicons name="person-add" size={20} color={ACCENT} />
  if (type === 'CONNECTION_ACCEPTED') return <Ionicons name="people" size={20} color="#22c55e" />
  if (type === 'MESSAGE') return <Ionicons name="chatbubble" size={20} color="#2196F3" />
  return <Ionicons name="notifications" size={20} color="#888" />
}

function notifMessage(notif) {
  const name = notif.fromUser?.fullName || 'Someone'
  if (notif.type === 'CONNECTION_REQUEST') return `${name} sent you a connection request`
  if (notif.type === 'CONNECTION_ACCEPTED') return `${name} accepted your connection request`
  if (notif.type === 'MESSAGE') return `${name} sent you a message`
  return 'You have a new notification'
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()

  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#999'

  const load = useCallback(async () => {
    try {
      const data = await getNotifications()
      setNotifications(data.notifications || [])
    } catch {
      setNotifications([])
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

  const markRead = async (id) => {
    try {
      await markNotificationRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch {}
  }

  const markAll = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch {
      Alert.alert('Error', 'Failed to mark all as read')
    }
  }

  const handleAccept = async (notif) => {
    const connectionId = notif.data?.connectionId
    if (!connectionId) return
    setActionLoading(prev => ({ ...prev, [notif.id]: 'accept' }))
    try {
      await acceptConnection(connectionId)
      await markRead(notif.id)
      setNotifications(prev => prev.map(n =>
        n.id === notif.id ? { ...n, read: true, _accepted: true } : n
      ))
    } catch {
      Alert.alert('Error', 'Failed to accept connection')
    } finally {
      setActionLoading(prev => ({ ...prev, [notif.id]: null }))
    }
  }

  const handleReject = async (notif) => {
    const connectionId = notif.data?.connectionId
    if (!connectionId) return
    setActionLoading(prev => ({ ...prev, [notif.id]: 'reject' }))
    try {
      await rejectConnection(connectionId)
      await markRead(notif.id)
      setNotifications(prev => prev.map(n =>
        n.id === notif.id ? { ...n, read: true, _rejected: true } : n
      ))
    } catch {
      Alert.alert('Error', 'Failed to reject connection')
    } finally {
      setActionLoading(prev => ({ ...prev, [notif.id]: null }))
    }
  }

  const handlePress = (notif) => {
    if (!notif.read) markRead(notif.id)
    if (notif.type === 'MESSAGE' && notif.fromUser) {
      router.push(`/chat/${notif.fromUser.id}`)
    } else if (notif.fromUser) {
      router.push(`/player/${notif.fromUser.id}`)
    }
  }

  const renderItem = ({ item }) => {
    const initials = (item.fromUser?.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    const isConnReq = item.type === 'CONNECTION_REQUEST'
    const accepted = item._accepted
    const rejected = item._rejected
    const al = actionLoading[item.id]

    return (
      <TouchableOpacity
        style={[styles.item, { backgroundColor: cardBg }, !item.read && styles.itemUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.iconWrap}>
          {item.fromUser?.profilePhotoUrl
            ? <Image source={{ uri: item.fromUser.profilePhotoUrl }} style={styles.avatar} />
            : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{initials}</Text></View>
          }
          <View style={styles.typeIcon}>
            <NotifIcon type={item.type} />
          </View>
        </View>
        <View style={styles.itemBody}>
          <Text style={[styles.itemText, { color: textColor }, !item.read && { fontFamily: 'Poppins_600SemiBold' }]}>
            {notifMessage(item)}
          </Text>
          <Text style={[styles.itemTime, { color: mutedColor }]}>{timeLabel(item.createdAt)}</Text>

          {isConnReq && !accepted && !rejected && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => handleAccept(item)}
                disabled={!!al}
              >
                {al === 'accept' ? <ActivityIndicator size={14} color="#fff" /> : <Text style={styles.actionBtnText}>Accept</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleReject(item)}
                disabled={!!al}
              >
                {al === 'reject' ? <ActivityIndicator size={14} color={ACCENT} /> : <Text style={[styles.actionBtnText, { color: ACCENT }]}>Decline</Text>}
              </TouchableOpacity>
            </View>
          )}
          {accepted && <Text style={styles.statusText}>✓ Connected</Text>}
          {rejected && <Text style={[styles.statusText, { color: mutedColor }]}>Declined</Text>}
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    )
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar backgroundColor={ACCENT} barStyle="light-content" />
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading
        ? <View style={styles.centered}><ActivityIndicator size="large" color={ACCENT} /></View>
        : (
          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="notifications-outline" size={56} color={isDark ? '#333' : '#ddd'} />
                <Text style={[styles.emptyTitle, { color: textColor }]}>No notifications</Text>
                <Text style={[styles.emptyHint, { color: mutedColor }]}>You're all caught up!</Text>
              </View>
            }
            contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : { paddingBottom: 20 }}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]} />}
          />
        )
      }
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
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold', flex: 1 },
  markAllText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'Poppins_500Medium' },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  itemUnread: { borderLeftWidth: 3, borderLeftColor: ACCENT },
  iconWrap: { position: 'relative', marginTop: 2 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { width: 46, height: 46, borderRadius: 23, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  typeIcon: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 },
  itemBody: { flex: 1 },
  itemText: { fontSize: 13, lineHeight: 20 },
  itemTime: { fontSize: 11, marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 14, minWidth: 72, alignItems: 'center' },
  acceptBtn: { backgroundColor: ACCENT },
  rejectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: ACCENT },
  actionBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  statusText: { fontSize: 12, color: '#22c55e', fontFamily: 'Poppins_600SemiBold', marginTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT, marginTop: 6 },
  separator: { height: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyWrap: { alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontFamily: 'Poppins_600SemiBold', marginTop: 16 },
  emptyHint: { fontSize: 13, marginTop: 6 },
})
