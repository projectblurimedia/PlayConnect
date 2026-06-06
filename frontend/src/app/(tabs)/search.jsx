import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text as RNText, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Image, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { useRouter } from 'expo-router'
import { searchPlayers, searchGrounds } from '../../services/api'

const ACCENT = '#C8102E'
function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

const SPORT_EMOJI = { CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', BADMINTON: '🏸', VOLLEYBALL: '🏐', KABADDI: '🤼', TENNIS: '🎾', OTHER: '🏃' }
const CATEGORIES = ['Players', 'Venues']

export default function SearchScreen() {
  const theme = useSelector(state => state.user.theme)
  const isDark = theme === 'dark'
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [active, setActive] = useState('Players')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef(null)

  const bg = isDark ? '#111' : '#f8f9fa'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#333'
  const mutedColor = isDark ? '#aaa' : '#888'
  const inputBg = isDark ? '#1e1e1e' : '#fff'
  const inputBorder = isDark ? '#2a2a2a' : '#e5e7eb'

  const runSearch = useCallback(async (q, category) => {
    setLoading(true)
    setSearched(true)
    try {
      if (category === 'Players') {
        const data = await searchPlayers(q)
        setResults(data.players || [])
      } else {
        const data = await searchGrounds(q)
        setResults(data.grounds || [])
      }
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (text) => {
    setQuery(text)
    clearTimeout(debounceRef.current)
    if (text.trim().length < 2) { setResults([]); setSearched(false); return }
    debounceRef.current = setTimeout(() => runSearch(text.trim(), active), 400)
  }

  const handleTabChange = (cat) => {
    setActive(cat)
    if (query.trim().length >= 2) runSearch(query.trim(), cat)
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: inputBg, borderColor: inputBorder }]}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder={`Search ${active.toLowerCase()}...`}
          placeholderTextColor={isDark ? '#555' : '#bbb'}
          value={query}
          onChangeText={handleChange}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => query.trim().length >= 2 && runSearch(query.trim(), active)}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false) }}>
            <Ionicons name="close-circle" size={20} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category tabs */}
      <View style={styles.tabsRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, active === cat && styles.tabActive, { borderColor: isDark ? '#2a2a2a' : '#e5e5e5' }]}
            onPress={() => handleTabChange(cat)}
          >
            <Text style={[styles.tabText, active === cat && styles.tabTextActive, { color: active === cat ? '#fff' : mutedColor, marginBottom: -3 }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      <ScrollView contentContainerStyle={styles.resultList} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />}

        {!loading && !searched && (
          <View style={styles.emptyBox}>
            <Ionicons name="search-outline" size={48} color="#ccc" />
            <Text style={[styles.emptyText, { color: mutedColor }]}>Search for {active.toLowerCase()}</Text>
            <Text style={[styles.emptyHint, { color: isDark ? '#555' : '#bbb' }]}>Type at least 2 characters</Text>
          </View>
        )}

        {!loading && searched && results.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="sad-outline" size={48} color="#ccc" />
            <Text style={[styles.emptyText, { color: mutedColor }]}>No {active.toLowerCase()} found</Text>
          </View>
        )}

        {!loading && active === 'Players' && results.map(p => {
          const initials = (p.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          const sport = p.sports?.[0]
          return (
            <TouchableOpacity key={p.id} style={[styles.playerRow, { backgroundColor: cardBg }]} onPress={() => router.push(`/player/${p.id}`)} activeOpacity={0.8}>
              {p.profilePhotoUrl
                ? <Image source={{ uri: p.profilePhotoUrl }} style={styles.avatar} />
                : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{initials}</Text></View>
              }
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, { color: textColor }]}>{p.fullName}</Text>
                <Text style={[styles.playerHandle, { color: mutedColor }]}>@{p.username} · {p.city}</Text>
                {sport && (
                  <Text style={styles.sportTag}>{SPORT_EMOJI[sport.sport]} {sport.sport}{sport.skillLevel ? ` · ${sport.skillLevel}` : ''}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={mutedColor} />
            </TouchableOpacity>
          )
        })}

        {!loading && active === 'Venues' && results.map(g => (
          <TouchableOpacity key={g.id} style={[styles.groundRow, { backgroundColor: cardBg }]} activeOpacity={0.8}>
            {g.photos?.[0]
              ? <Image source={{ uri: g.photos[0] }} style={styles.groundThumb} />
              : <View style={[styles.groundThumbFallback, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
                  <Ionicons name="location" size={22} color="#ccc" />
                </View>
            }
            <View style={styles.groundInfo}>
              <Text style={[styles.groundName, { color: textColor }]}>{g.name}</Text>
              <Text style={[styles.groundCity, { color: mutedColor }]}>{g.city}, {g.state}</Text>
              <View style={styles.groundMeta}>
                <Text style={styles.groundPrice}>₹{g.pricePerHour}/hr</Text>
                {g.isVerified && <Text style={styles.verifiedText}>✓ Verified</Text>}
              </View>
              <Text style={styles.groundSports}>{(g.supportedSports || []).map(s => SPORT_EMOJI[s] || '🏃').join(' ')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    margin: 14, marginBottom: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    gap: 8, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  input: { flex: 1, fontSize: 14, fontFamily: 'Poppins_400Regular', paddingVertical: 4 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 14, gap: 10, marginBottom: 10 },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  tabActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  tabTextActive: { color: '#fff' },
  resultList: { paddingHorizontal: 14, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginTop: 14 },
  emptyHint: { fontSize: 12, marginTop: 6 },

  // Player row
  playerRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14,
    padding: 12, marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  playerInfo: { flex: 1, justifyContent: 'center' },
  playerName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  playerHandle: { fontSize: 12, marginTop: 2 },
  sportTag: { fontSize: 11, color: ACCENT, fontFamily: 'Poppins_500Medium', marginTop: 3 },

  // Ground row
  groundRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14,
    overflow: 'hidden', marginBottom: 10, minHeight: 80,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  groundThumb: { width: 80, alignSelf: 'stretch' },
  groundThumbFallback: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  groundInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  groundName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  groundCity: { fontSize: 11, marginTop: 2 },
  groundMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  groundPrice: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: ACCENT },
  verifiedText: { fontSize: 11, color: '#22c55e', fontFamily: 'Poppins_500Medium' },
  groundSports: { fontSize: 14, marginTop: 3 },
})
