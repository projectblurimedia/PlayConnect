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
} from 'react-native'
import { Tabs, useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import { logout, toggleTheme } from '../../store/userSlice'
import { getNotifications } from '../../services/api'
import { showAlert } from '@/components/GlobalAlert'

const ACCENT = '#C8102E'
const poppins = { fontFamily: 'Poppins_400Regular' }

// Per-tab accent colors
const TC = {
  home:     '#FF6B35',
  feed:     '#7C3AED',
  search:   '#0EA5E9',
  messages: '#10B981',
  profile:  '#EC4899',
}

// Sidebar section colors
const SC = {
  match:  '#FF6B35',
  feed:   '#7C3AED',
  teams:  '#10B981',
  venues: '#0EA5E9',
}

function Text(props) {
  return <RNText {...props} style={[poppins, props.style]} />
}

// Renders a tab icon with a small colored indicator bar above when active
function makeTabIcon(activeIcon, inactiveIcon) {
  return function TabIcon({ color, size, focused }) {
    return (
      <View style={styles.tabIconOuter}>
        {focused && <View style={[styles.tabIndicator, { backgroundColor: color }]} />}
        <Ionicons
          name={focused ? activeIcon : inactiveIcon}
          size={size}
          color={color}
        />
      </View>
    )
  }
}

// ── App Header ─────────────────────────────────────────────────────────────
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

// ── Sidebar data ────────────────────────────────────────────────────────────
const MATCH_ITEMS = [
  { icon: 'add-circle-outline', label: 'Create Match', route: '/create-match' },
  { icon: 'enter-outline',      label: 'Join Match',   route: '/join-match' },
  { icon: 'trophy-outline',     label: 'Tournaments',  route: '/tournaments' },
  { icon: 'flash-outline',      label: 'Challenges',   route: '/challenges' },
]
const FEED_ITEMS = [
  { icon: 'camera-outline', label: 'Create Post', route: '/create-post' },
]
const TEAM_ITEMS = [
  { icon: 'people-outline',      label: 'My Teams',     route: '/teams' },
  { icon: 'add-circle-outline',  label: 'Create Team',  route: '/create-team' },
  { icon: 'qr-code-outline',     label: 'Join Team',    route: '/join-team' },
]
const VENUE_ITEMS = [
  { icon: 'calendar-outline',    label: 'My Bookings',     route: '/my-bookings' },
  { icon: 'business-outline',    label: 'My Venues',       route: '/my-venues' },
  { icon: 'add-circle-outline',  label: 'Register Venue',  route: '/register-venue' },
]

// ── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ visible, onClose }) {
  const dispatch  = useDispatch()
  const router    = useRouter()
  const theme     = useSelector(s => s.user.theme)
  const user      = useSelector(s => s.user.user)
  const insets    = useSafeAreaInsets()
  const isDark    = theme === 'dark'

  const bg       = isDark ? '#18181B' : '#fff'
  const textColor = isDark ? '#F4F4F5' : '#18181B'
  const mutedColor= isDark ? '#71717A' : '#A1A1AA'
  const divider   = isDark ? '#27272A' : '#F4F4F5'

  const initials = (user?.fullName || user?.username || '?').slice(0, 2).toUpperCase()

  const navigate = (route) => { onClose(); router.push(route) }

  const handleLogout = () =>
    showAlert('Logout', 'Are you sure you want to sign out?',
      [{ text: 'Cancel', style: 'cancel' },
       { text: 'Sign Out', style: 'destructive',
         onPress: () => { dispatch(logout()); onClose(); router.replace('/login') } }],
      { cancelable: true }
    )

  function Section({ title, color, items }) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        {items.map(item => (
          <TouchableOpacity key={item.label} style={styles.menuRow} onPress={() => navigate(item.route)} activeOpacity={0.68}>
            <View style={[styles.menuIcon, { backgroundColor: color + '1E' }]}>
              <Ionicons name={item.icon} size={20} color={color} />
            </View>
            <Text style={[styles.menuLabel, { color: textColor }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={14} color={mutedColor} />
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

      <View style={[styles.sidebar, { backgroundColor: bg }]}>
        {/* ── Gradient header ─────────────────────── */}
        <LinearGradient
          colors={['#C8102E', '#7C3AED']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.sidebarHeader, { paddingTop: (insets.top || 44) + 14 }]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          <LinearGradient
            colors={['#F59E0B', '#EC4899', '#6366F1']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.sidebarAvatar}
          >
            <Text style={styles.sidebarAvatarTxt}>{initials}</Text>
          </LinearGradient>

          {user && (
            <>
              <Text style={styles.sidebarName}>{user.fullName}</Text>
              <Text style={styles.sidebarHandle}>@{user.username}</Text>
            </>
          )}
        </LinearGradient>

        {/* ── Scrollable body ──────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuBody}
        >
          <Section title="MATCH"  color={SC.match}  items={MATCH_ITEMS} />
          <View style={[styles.divider, { backgroundColor: divider }]} />

          <Section title="FEED"   color={SC.feed}   items={FEED_ITEMS} />
          <View style={[styles.divider, { backgroundColor: divider }]} />

          <Section title="TEAMS"  color={SC.teams}  items={TEAM_ITEMS} />
          <View style={[styles.divider, { backgroundColor: divider }]} />

          <Section title="VENUES" color={SC.venues} items={VENUE_ITEMS} />
          <View style={[styles.divider, { backgroundColor: divider }]} />

          {/* Theme toggle */}
          <View style={styles.menuRow}>
            <View style={[styles.menuIcon, { backgroundColor: isDark ? '#7C3AED1E' : '#F59E0B1E' }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={20} color={isDark ? '#7C3AED' : '#F59E0B'} />
            </View>
            <Text style={[styles.menuLabel, { color: textColor }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
            <Switch
              value={isDark}
              onValueChange={() => dispatch(toggleTheme())}
              trackColor={{ false: '#E4E4E7', true: '#7C3AED' }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: divider }]} />

          {/* Logout */}
          <View style={styles.logoutWrap}>
            <TouchableOpacity onPress={handleLogout} activeOpacity={0.82}>
              <LinearGradient
                colors={['#FF4757', '#C8102E']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.logoutBtn}
              >
                <Ionicons name="log-out-outline" size={19} color="#fff" />
                <Text style={styles.logoutTxt}>Sign Out</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Tabs layout ─────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifCount, setNotifCount]   = useState(0)
  const theme    = useSelector(s => s.user.theme)
  const isDark   = theme === 'dark'
  const router   = useRouter()
  const insets   = useSafeAreaInsets()
  const pathname = usePathname()
  const hideShell = pathname === '/challenges'

  const loadNotifCount = useCallback(async () => {
    try {
      const data = await getNotifications()
      setNotifCount(data.unreadCount || 0)
    } catch {}
  }, [])

  useEffect(() => {
    loadNotifCount()
    const iv = setInterval(loadNotifCount, 30000)
    return () => clearInterval(iv)
  }, [loadNotifCount])

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#111' : '#fff' }]}>
      <StatusBar backgroundColor={ACCENT} barStyle="light-content" />

      {!hideShell && (
        <AppHeader
          onMenuPress={() => setSidebarOpen(true)}
          onNotifPress={() => router.push('/notifications')}
          notifCount={notifCount}
        />
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarInactiveTintColor: isDark ? '#555' : '#A1A1AA',
          tabBarLabelStyle: {
            fontFamily: 'Poppins_600SemiBold',
            fontSize: 10,
            marginTop: -2,
          },
          tabBarStyle: [
            styles.tabBar,
            isDark && styles.tabBarDark,
            { height: 62 + insets.bottom, paddingBottom: 8 + insets.bottom },
          ],
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarActiveTintColor: TC.home,
            tabBarIcon: makeTabIcon('home', 'home-outline'),
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarActiveTintColor: TC.feed,
            tabBarIcon: makeTabIcon('play-circle', 'play-circle-outline'),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarActiveTintColor: TC.search,
            tabBarIcon: makeTabIcon('search', 'search-outline'),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarActiveTintColor: TC.messages,
            tabBarIcon: makeTabIcon('chatbubbles', 'chatbubbles-outline'),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarActiveTintColor: TC.profile,
            tabBarIcon: makeTabIcon('person', 'person-outline'),
          }}
        />
        <Tabs.Screen name="challenges" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      </Tabs>

      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </View>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pBadge: {
    width: 42, height: 42,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  pLetter: { fontSize: 23, fontFamily: 'Poppins_800ExtraBold', color: '#fff', lineHeight: 28 },
  pRunner: { position: 'absolute', bottom: 4, right: 4 },
  brandCol: { gap: 2 },
  brandRow: { fontSize: 18, lineHeight: 22 },
  brandPlay:    { fontFamily: 'Poppins_800ExtraBold', color: '#fff' },
  brandConnect: { fontFamily: 'Poppins_800ExtraBold', color: 'rgba(255,255,255,0.75)' },
  tagline:       { fontSize: 8.5, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  taglineAccent: { color: '#fff', fontFamily: 'Poppins_700Bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBtn: { padding: 8, position: 'relative' },
  notifBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#FFD700', borderRadius: 7,
    minWidth: 15, height: 15,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#111', fontSize: 8.5, fontFamily: 'Poppins_700Bold' },

  // Tab bar
  tabBar: {
    backgroundColor: '#FAFAFA',
    borderTopColor: '#E9E9E9',
    borderTopWidth: 1,
    paddingTop: 6,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tabBarDark: { backgroundColor: '#1C1C1E', borderTopColor: '#2A2A2E' },

  // Tab icon
  tabIconOuter: { alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  tabIndicator: { position: 'absolute', top: -9, width: 20, height: 3, borderRadius: 2 },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },

  // Sidebar shell
  sidebar: {
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
    overflow: 'hidden',
  },

  // Sidebar gradient header
  sidebarHeader: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  closeBtn: { alignSelf: 'flex-end', padding: 4, marginBottom: 18 },
  sidebarAvatar: {
    width: 68, height: 68, borderRadius: 34,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  sidebarAvatarTxt: { fontSize: 24, fontFamily: 'Poppins_800ExtraBold', color: '#fff' },
  sidebarName:   { fontSize: 17, fontFamily: 'Poppins_700Bold', color: '#fff', marginBottom: 3 },
  sidebarHandle: { fontSize: 13, color: 'rgba(255,255,255,0.72)' },

  // Menu body
  menuBody: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 6 },

  // Section
  section: { paddingVertical: 10 },
  sectionTitle: {
    fontSize: 11, fontFamily: 'Poppins_800ExtraBold',
    letterSpacing: 1.8, marginBottom: 8, marginLeft: 4,
  },

  // Menu row
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, gap: 14,
  },
  menuIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 14.5, fontFamily: 'Poppins_600SemiBold' },

  // Divider
  divider: { height: 1, marginVertical: 6 },

  // Logout
  logoutWrap: { marginTop: 14, marginBottom: 4 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 50, borderRadius: 14,
  },
  logoutTxt: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#fff' },
})
