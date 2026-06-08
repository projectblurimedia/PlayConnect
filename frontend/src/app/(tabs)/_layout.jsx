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
import { LinearGradient } from 'expo-linear-gradient'
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
  const topPad = insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44)

  return (
    <LinearGradient
      colors={[ACCENT, '#a00d24']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: topPad + 10 }]}
    >
      {/* Left: P badge + brand name + tagline */}
      <View style={styles.headerLeft}>
        <View style={styles.pBadge}>
          <Text style={styles.pLetter}>P</Text>
          <Ionicons name="walk" size={9} color="#fff" style={styles.pRunner} />
        </View>
        <View style={styles.brandCol}>
          <Text style={styles.brandRow}>
            <Text style={styles.brandPlay}>PLAY</Text>
            <Text style={styles.brandConnect}>CONNECT</Text>
          </Text>
          <Text style={styles.tagline}>
            {'STOP VIRTUAL GAMES. START '}
            <Text style={styles.taglineAccent}>REAL BATTLES.</Text>
          </Text>
        </View>
      </View>

      {/* Right: notifications + menu */}
      <View style={styles.headerRight}>
        <TouchableOpacity onPress={onNotifPress} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="notifications-outline" size={22} color="#fff" />
          {notifCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{notifCount > 99 ? '99+' : String(notifCount)}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onMenuPress} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const MENU_ITEMS = [
  { icon: 'add-circle-outline', label: 'Create Match', route: '/create-match' },
  { icon: 'enter-outline', label: 'Join Match', route: '/join-match' },
  { icon: 'trophy-outline', label: 'Tournaments', route: '/tournaments' },
]

const TEAM_MENU_ITEMS = [
  { icon: 'people-outline', label: 'My Teams', route: '/teams' },
  { icon: 'add-circle-outline', label: 'Create Team', route: '/create-team' },
  { icon: 'qr-code-outline', label: 'Join Team', route: '/join-team' },
]

const VENUE_MENU_ITEMS = [
  { icon: 'calendar-outline', label: 'My Bookings', route: '/my-bookings' },
  { icon: 'business-outline', label: 'My Venues', route: '/my-venues' },
  { icon: 'add-circle-outline', label: 'Register Venue', route: '/register-venue' },
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
          <Text style={[styles.sidebarSectionLabel, { color: mutedColor }]}>TEAMS</Text>
          {TEAM_MENU_ITEMS.map(item => (
            <TouchableOpacity key={item.label} style={styles.sidebarItem} onPress={() => navigate(item.route)}>
              <View style={styles.sidebarItemLeft}>
                <Ionicons name={item.icon} size={22} color={isDark ? '#fff' : '#333'} />
                <Text style={[styles.sidebarItemText, { color: isDark ? '#fff' : '#333' }]}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color={mutedColor} />
            </TouchableOpacity>
          ))}

          <View style={[styles.sidebarDivider, { backgroundColor: dividerColor }]} />
          <Text style={[styles.sidebarSectionLabel, { color: mutedColor }]}>VENUES</Text>
          {VENUE_MENU_ITEMS.map(item => (
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pBadge: {
    width: 42,
    height: 42,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  pLetter: { fontSize: 23, fontFamily: 'Poppins_800ExtraBold', color: '#fff', lineHeight: 28 },
  pRunner: { position: 'absolute', bottom: 4, right: 4 },
  brandCol: { gap: 2 },
  brandRow: { fontSize: 18, lineHeight: 22 },
  brandPlay: { fontFamily: 'Poppins_800ExtraBold', color: '#fff' },
  brandConnect: { fontFamily: 'Poppins_800ExtraBold', color: 'rgba(255,255,255,0.75)' },
  tagline: {
    fontSize: 8.5,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  taglineAccent: { color: '#fff', fontFamily: 'Poppins_700Bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBtn: { padding: 8, position: 'relative' },
  notifBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#FFD700', borderRadius: 7, minWidth: 15, height: 15,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#111', fontSize: 8.5, fontFamily: 'Poppins_700Bold' },
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
  sidebarSectionLabel: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1.2, marginBottom: 4 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sidebarItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sidebarItemText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
})
