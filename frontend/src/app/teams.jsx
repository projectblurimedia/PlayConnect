import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import { getMyTeams } from '../services/api'

const ACCENT = '#C8102E'
const poppins = { fontFamily: 'Poppins_400Regular' }

const ROLE_LABELS = {
  ADMIN: 'Admin',
  CAPTAIN: 'Captain',
  VICE_CAPTAIN: 'Vice Captain',
  WICKET_KEEPER: 'Wicket Keeper',
  PLAYER: 'Player',
}

const ROLE_COLORS = {
  ADMIN: '#C8102E',
  CAPTAIN: '#f59e0b',
  VICE_CAPTAIN: '#3b82f6',
  WICKET_KEEPER: '#8b5cf6',
  PLAYER: '#6b7280',
}

function RoleBadge({ role }) {
  return (
    <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[role] + '22' }]}>
      <Text style={[poppins, styles.roleText, { color: ROLE_COLORS[role] }]}>{ROLE_LABELS[role]}</Text>
    </View>
  )
}

function TeamCard({ team, onPress }) {
  const memberCount = team.members?.length || 0
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardLeft}>
        <View style={styles.teamIcon}>
          <Ionicons name="people" size={26} color={ACCENT} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[poppins, styles.cardName]} numberOfLines={1}>{team.name}</Text>
          <Text style={[poppins, styles.cardSport]}>{team.sport} • {memberCount}/{team.maxPlayers} players</Text>
          <RoleBadge role={team.myRole} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#bbb" />
    </TouchableOpacity>
  )
}

export default function TeamsScreen() {
  const router = useRouter()
  const theme = useSelector(s => s.user.theme)
  const isDark = theme === 'dark'

  const bg = isDark ? '#111' : '#f7f7f7'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#888'

  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getMyTeams()
      setTeams(data.teams || [])
    } catch {
      setTeams([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const onRefresh = () => { setRefreshing(true); load() }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[poppins, styles.headerTitle, { color: textColor }]}>My Teams</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/join-team')} style={styles.headerBtn}>
            <Ionicons name="qr-code-outline" size={22} color={ACCENT} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/create-team')} style={styles.headerBtn}>
            <Ionicons name="add-circle" size={26} color={ACCENT} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={teams}
        keyExtractor={t => t.id}
        contentContainerStyle={teams.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        renderItem={({ item }) => (
          <TeamCard
            team={item}
            onPress={() => router.push(`/team/${item.id}`)}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={64} color={ACCENT + '55'} />
            <Text style={[poppins, styles.emptyTitle, { color: textColor }]}>No teams yet</Text>
            <Text style={[poppins, styles.emptyMsg, { color: mutedColor }]}>Create a team or join one with an invite code.</Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/create-team')}>
                <Text style={[poppins, styles.primaryBtnText]}>Create Team</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: ACCENT }]} onPress={() => router.push('/join-team')}>
                <Text style={[poppins, styles.secondaryBtnText, { color: ACCENT }]}>Join with Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: 'Poppins_700Bold', marginLeft: 12 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { padding: 6 },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 4,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  teamIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: ACCENT + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#111', marginBottom: 2 },
  cardSport: { fontSize: 12, color: '#888', marginBottom: 6 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, marginTop: 60 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', marginTop: 16 },
  emptyMsg: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  emptyActions: { flexDirection: 'row', gap: 12, marginTop: 28 },
  primaryBtn: { backgroundColor: ACCENT, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  secondaryBtn: { borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10 },
  secondaryBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
})
