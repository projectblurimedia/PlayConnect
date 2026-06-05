import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text as RNText,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Platform,
  Switch,
  ScrollView,
  Alert,
} from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import { logout, toggleTheme } from '../../store/userSlice'
import { getNotifications } from '../../services/api'

const ACCENT = '#C8102E'
const poppins = { fontFamily: 'Poppins_400Regular' }

function Text(props) {
  return <RNText {...props} style={[poppins, props.style]} />
}

function AppHeader({ onMenuPress, onNotifPress, notifCount }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.header, { paddingTop: insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44) }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.logoText}>PLAY<Text style={styles.logoAccent}>CONNECT</Text></Text>
          <Text style={styles.tagline}>Stop Virtual Games. Start Real Battles.</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onNotifPress} style={styles.notifBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {notifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{notifCount > 99 ? '99+' : String(notifCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="menu" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.headerIconsRow}>
        {['🏏', '⚽', '🏀', '🏸', '🏐', '🎾', '🏊', '🚴', '🏃', '🏑', '🏓', '🤼'].map((icon, i) => (
          <RNText key={i} style={styles.headerIcon}>{icon}</RNText>
        ))}
      </View>
    </View>
  )
}

const MENU_ITEMS = [
  { icon: 'add-circle-outline', label: 'Create Match', route: '/create-match' },
  { icon: 'enter-outline', label: 'Join Match', route: '/join-match' },
  { icon: 'trophy-outline', label: 'Tournaments', route: '/tournaments' },
  { icon: 'location-outline', label: 'Register Venue', route: '/register-venue' },
]

function Sidebar({ visible, onClose }) {
  const dispatch = useDispatch()
  const router = useRouter()
  const theme = useSelector(state => state.user.theme)
  const user = useSelector(state => state.user.user)
  const insets = useSafeAreaInsets()
  const isDark = theme === 'dark'

  const bg = isDark ? '#1a1a1a' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'
  const dividerColor = isDark ? '#2a2a2a' : '#f0f0f0'

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            dispatch(logout())
            onClose()
            router.replace('/login')
          },
        },
      ],
      { cancelable: true }
    )
  }

  const navigate = (route) => {
    onClose()
    router.push(route)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent={true} onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sidebar, { paddingTop: (insets.top || 44) + 12, backgroundColor: bg }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>

        {user && (
          <View style={styles.sidebarUser}>
            <View style={styles.sidebarAvatar}>
              <Text style={styles.sidebarAvatarText}>
                {(user.fullName || user.username || '?').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.sidebarName, { color: textColor }]}>{user.fullName}</Text>
            <Text style={[styles.sidebarHandle, { color: mutedColor }]}>@{user.username}</Text>
          </View>
        )}

        <View style={[styles.sidebarDivider, { backgroundColor: dividerColor }]} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {MENU_ITEMS.map(item => (
            <TouchableOpacity key={item.label} style={styles.sidebarItem} onPress={() => navigate(item.route)}>
              <View style={styles.sidebarItemLeft}>
                <Ionicons name={item.icon} size={22} color={isDark ? '#fff' : '#333'} />
                <Text style={[styles.sidebarItemText, { color: isDark ? '#fff' : '#333' }]}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color={mutedColor} />
            </TouchableOpacity>
          ))}

          <View style={[styles.sidebarDivider, { backgroundColor: dividerColor }]} />

          <View style={styles.sidebarItem}>
            <View style={styles.sidebarItemLeft}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={isDark ? '#fff' : '#333'} />
              <Text style={[styles.sidebarItemText, { color: isDark ? '#fff' : '#333' }]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={() => dispatch(toggleTheme())}
              trackColor={{ false: '#ccc', true: ACCENT }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.sidebarDivider, { backgroundColor: dividerColor }]} />

          <TouchableOpacity style={styles.sidebarItem} onPress={handleLogout}>
            <View style={styles.sidebarItemLeft}>
              <Ionicons name="log-out-outline" size={22} color={ACCENT} />
              <Text style={[styles.sidebarItemText, { color: ACCENT }]}>Logout</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )
}

export default function TabsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()

  const loadNotifCount = useCallback(async () => {
    try {
      const data = await getNotifications()
      setNotifCount(data.unreadCount || 0)
    } catch {}
  }, [])

  useEffect(() => {
    loadNotifCount()
    const interval = setInterval(loadNotifCount, 30000)
    return () => clearInterval(interval)
  }, [loadNotifCount])

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#111' : '#fff' }]}>
      <StatusBar backgroundColor={ACCENT} barStyle="light-content" />
      <AppHeader
        onMenuPress={() => setSidebarOpen(true)}
        onNotifPress={() => router.push('/notifications')}
        notifCount={notifCount}
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: ACCENT,
          tabBarInactiveTintColor: isDark ? '#666' : '#888',
          tabBarStyle: [styles.tabBar, isDark && styles.tabBarDark],
          tabBarLabelStyle: { fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="challenges"
          options={{
            title: 'Challenges',
            tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
        <Tabs.Screen name="feed" options={{ href: null }} />
      </Tabs>
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: ACCENT, paddingHorizontal: 16, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flex: 1 },
  logoText: { color: '#fff', fontSize: 20, fontFamily: 'Poppins_800ExtraBold', letterSpacing: -0.5 },
  logoAccent: { opacity: 0.85 },
  tagline: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontFamily: 'Poppins_400Regular', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notifBtn: { padding: 4, position: 'relative' },
  notifBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#FFD700', borderRadius: 8, minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#111', fontSize: 9, fontFamily: 'Poppins_700Bold' },
  menuBtn: { padding: 4, marginLeft: 4 },
  headerIconsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, opacity: 0.5 },
  headerIcon: { fontSize: 14 },
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: '#f0f0f0',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 6,
    paddingTop: 4,
  },
  tabBarDark: { backgroundColor: '#1a1a1a', borderTopColor: '#2a2a2a' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sidebar: {
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    width: 290,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 12,
  },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 16 },
  sidebarUser: { alignItems: 'center', paddingVertical: 16 },
  sidebarAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  sidebarAvatarText: { color: '#fff', fontSize: 22, fontFamily: 'Poppins_700Bold' },
  sidebarName: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  sidebarHandle: { fontSize: 13, marginTop: 2 },
  sidebarDivider: { height: 1, marginVertical: 12 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sidebarItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sidebarItemText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
})
