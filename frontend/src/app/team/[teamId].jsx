import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
} from 'react-native'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import {
  getTeamDetail,
  assignTeamRole,
  removeTeamMember,
  leaveTeam,
  deleteTeam,
} from '../../services/api'

const ACCENT = '#C8102E'
const poppins = { fontFamily: 'Poppins_400Regular' }

const ROLE_LABELS = {
  ADMIN: 'Admin',
  CAPTAIN: 'Captain',
  VICE_CAPTAIN: 'Vice Captain',
  WICKET_KEEPER: 'Keeper',
  PLAYER: 'Player',
}

const ROLE_COLORS = {
  ADMIN: '#C8102E',
  CAPTAIN: '#f59e0b',
  VICE_CAPTAIN: '#3b82f6',
  WICKET_KEEPER: '#8b5cf6',
  PLAYER: '#6b7280',
}

const ROLE_ICONS = {
  ADMIN: 'shield',
  CAPTAIN: 'star',
  VICE_CAPTAIN: 'ribbon',
  WICKET_KEEPER: 'hand-left',
  PLAYER: 'person',
}

const ASSIGNABLE_ROLES = [
  { value: 'CAPTAIN',       label: 'Captain',        icon: 'star',       desc: 'Leads the team on the field' },
  { value: 'VICE_CAPTAIN',  label: 'Vice Captain',   icon: 'ribbon',     desc: 'Second in command' },
  { value: 'WICKET_KEEPER', label: 'Wicket Keeper',  icon: 'hand-left',  desc: 'Keeper position behind the stumps' },
  { value: 'PLAYER',        label: 'Player',         icon: 'person',     desc: 'Regular team member' },
]

function RoleBadge({ role }) {
  return (
    <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[role] + '22' }]}>
      <Ionicons name={ROLE_ICONS[role]} size={11} color={ROLE_COLORS[role]} />
      <Text style={[poppins, styles.roleText, { color: ROLE_COLORS[role] }]}>
        {ROLE_LABELS[role]}
      </Text>
    </View>
  )
}

function MemberCard({ member, isAdmin, createdBy, onLongPress, onPress }) {
  const isCreator = member.userId === createdBy
  const canLongPress = isAdmin

  return (
    <TouchableOpacity
      style={styles.memberCard}
      onLongPress={canLongPress ? onLongPress : undefined}
      onPress={onPress}
      activeOpacity={0.8}
      delayLongPress={350}
    >
      <View style={styles.memberAvatar}>
        <Text style={[poppins, styles.memberAvatarText]}>
          {(member.user?.fullName || member.user?.username || '?').slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={[poppins, styles.memberName]} numberOfLines={1}>{member.user?.fullName}</Text>
          {isCreator && (
            <View style={styles.creatorBadge}>
              <Ionicons name="shield" size={9} color="#C8102E" />
              <Text style={[poppins, styles.creatorBadgeText]}>Admin</Text>
            </View>
          )}
        </View>
        <Text style={[poppins, styles.memberUsername]} numberOfLines={1}>@{member.user?.username}</Text>
        {member.user?.city ? <Text style={[poppins, styles.memberCity]}>{member.user.city}</Text> : null}
      </View>
      <RoleBadge role={member.role} />
    </TouchableOpacity>
  )
}

// ── Role Picker Bottom Sheet ──────────────────────────────────────────────────

function RolePickerModal({ visible, member, onClose, onAssign, loading }) {
  if (!member) return null
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        {/* dim backdrop — tap to close */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          {/* drag handle */}
          <View style={styles.sheetHandle} />

          {/* header row */}
          <View style={styles.sheetHeader}>
            <View style={{ width: 32 }} />
            <Text style={[poppins, styles.sheetTitle]}>Assign Role</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={[poppins, styles.sheetSub]}>{member.user?.fullName}</Text>

          <View style={styles.roleList}>
            {ASSIGNABLE_ROLES.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleOption, member.role === r.value && styles.roleOptionActive]}
                onPress={() => onAssign(r.value)}
                disabled={loading}
                activeOpacity={0.75}
              >
                <View style={[styles.roleOptionIcon, { backgroundColor: ROLE_COLORS[r.value] + '20' }]}>
                  <Ionicons name={r.icon} size={20} color={ROLE_COLORS[r.value]} />
                </View>
                <View style={styles.roleOptionInfo}>
                  <Text style={[poppins, styles.roleOptionLabel, { color: ROLE_COLORS[r.value] }]}>{r.label}</Text>
                  <Text style={[poppins, styles.roleOptionDesc]}>{r.desc}</Text>
                </View>
                {member.role === r.value
                  ? <Ionicons name="checkmark-circle" size={20} color={ROLE_COLORS[r.value]} />
                  : <View style={{ width: 20 }} />
                }
              </TouchableOpacity>
            ))}
          </View>

          {loading && <ActivityIndicator color={ACCENT} style={{ marginTop: 8 }} />}
        </View>
      </View>
    </Modal>
  )
}

// ── Member Actions Bottom Sheet ───────────────────────────────────────────────

function MemberActionsModal({ visible, member, createdBy, onClose, onAssignRole, onRemove }) {
  if (!member) return null
  const isCreator = member.userId === createdBy

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        {/* dim backdrop — tap to close */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />

        <View style={styles.actionSheet}>
          {/* drag handle */}
          <View style={styles.sheetHandle} />

          {/* header row */}
          <View style={styles.sheetHeader}>
            <View style={{ width: 32 }} />
            <Text style={[poppins, styles.sheetTitle]}>{member.user?.fullName}</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.actionItem} onPress={onAssignRole} activeOpacity={0.75}>
            <View style={[styles.actionIconWrap, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="shield-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={[poppins, styles.actionText, { color: '#3b82f6' }]}>Assign Cricket Role</Text>
            <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
          </TouchableOpacity>

          {/* hide Remove for the creator */}
          {!isCreator && (
            <TouchableOpacity style={styles.actionItem} onPress={onRemove} activeOpacity={0.75}>
              <View style={[styles.actionIconWrap, { backgroundColor: ACCENT + '20' }]}>
                <Ionicons name="person-remove-outline" size={20} color={ACCENT} />
              </View>
              <Text style={[poppins, styles.actionText, { color: ACCENT }]}>Remove from Team</Text>
              <Ionicons name="chevron-forward" size={16} color={ACCENT} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function TeamDetailScreen() {
  const router = useRouter()
  const { teamId } = useLocalSearchParams()
  const theme = useSelector(s => s.user.theme)
  const myUserId = useSelector(s => s.user.user?.id)
  const isDark = theme === 'dark'

  const bg      = isDark ? '#111'    : '#f7f7f7'
  const cardBg  = isDark ? '#1e1e1e' : '#fff'
  const textColor  = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#888'

  const [team, setTeam]                       = useState(null)
  const [loading, setLoading]                 = useState(true)
  const [selectedMember, setSelectedMember]   = useState(null)
  const [actionsOpen, setActionsOpen]         = useState(false)
  const [rolePickerOpen, setRolePickerOpen]   = useState(false)
  const [roleLoading, setRoleLoading]         = useState(false)

  const [isMember, setIsMember] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await getTeamDetail(teamId)
      setTeam(data.team)
      setIsMember(data.isMember !== false)
    } catch {
      Alert.alert('Error', 'Could not load team')
      router.back()
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  // Admin = team creator; non-members get read-only view
  const isAdmin = isMember && team?.createdBy === myUserId

  const openActions = (member) => {
    setSelectedMember(member)
    setActionsOpen(true)
  }

  const handleAssignRole = async (role) => {
    setRoleLoading(true)
    try {
      await assignTeamRole(teamId, selectedMember.userId, role)
      setRolePickerOpen(false)
      setActionsOpen(false)
      setSelectedMember(null)
      load()
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to assign role')
    } finally {
      setRoleLoading(false)
    }
  }

  const handleRemoveMember = () => {
    setActionsOpen(false)
    Alert.alert(
      'Remove Member',
      `Remove ${selectedMember?.user?.fullName} from the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await removeTeamMember(teamId, selectedMember.userId)
              setSelectedMember(null)
              load()
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to remove member')
            }
          },
        },
      ]
    )
  }

  const handleLeave = () => {
    Alert.alert(
      isAdmin ? 'Delete Team' : 'Leave Team',
      isAdmin
        ? 'This will permanently delete the team for everyone. Continue?'
        : 'Are you sure you want to leave this team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isAdmin ? 'Delete' : 'Leave', style: 'destructive',
          onPress: async () => {
            try {
              if (isAdmin) await deleteTeam(teamId)
              else await leaveTeam(teamId)
              router.replace('/teams')
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed')
            }
          },
        },
      ]
    )
  }

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join ${team.name} on PlayConnect!\nInvite Code: ${team.inviteCode}\nOpen PlayConnect → Join Team → Enter code: ${team.inviteCode}`,
        title: `Join ${team.name}`,
      })
    } catch {}
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    )
  }
  if (!team) return null

  const memberCount = team.members?.length || 0
  const captain     = team.members?.find(m => m.role === 'CAPTAIN')
  const viceCaptain = team.members?.find(m => m.role === 'VICE_CAPTAIN')
  const keeper      = team.members?.find(m => m.role === 'WICKET_KEEPER')

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: cardBg }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[poppins, styles.headerTitle, { color: textColor }]} numberOfLines={1}>{team.name}</Text>
        {isAdmin
          ? <TouchableOpacity onPress={handleLeave} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={22} color={ACCENT} />
            </TouchableOpacity>
          : <View style={{ width: 24 }} />
        }
      </View>

      <FlatList
        data={team.members}
        keyExtractor={m => m.id}
        contentContainerStyle={[styles.scroll, { backgroundColor: bg }]}
        ListHeaderComponent={() => (
          // ← wrap in View with gap so cards don't overlap
          <View style={styles.headerSection}>

            {/* Team info card */}
            <View style={[styles.infoCard, { backgroundColor: cardBg }]}>
              <View style={styles.teamIconLarge}>
                <Ionicons name="people" size={36} color={ACCENT} />
              </View>
              <Text style={[poppins, styles.teamName, { color: textColor }]}>{team.name}</Text>
              {!!team.description && (
                <Text style={[poppins, styles.teamDesc, { color: mutedColor }]}>{team.description}</Text>
              )}
              <View style={styles.teamMeta}>
                <View style={[styles.metaBadge, { backgroundColor: ACCENT + '15' }]}>
                  <Ionicons name="baseball-outline" size={13} color={ACCENT} />
                  <Text style={[poppins, styles.metaText, { color: ACCENT }]}>{team.sport}</Text>
                </View>
                <View style={[styles.metaBadge, { backgroundColor: '#3b82f615' }]}>
                  <Ionicons name="people-outline" size={13} color="#3b82f6" />
                  <Text style={[poppins, styles.metaText, { color: '#3b82f6' }]}>{memberCount}/{team.maxPlayers}</Text>
                </View>
              </View>

              {/* Invite code row — only for members */}
              {isMember && team.inviteCode ? (
                <TouchableOpacity style={[styles.codeRow, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]} onPress={handleShareCode}>
                  <View style={styles.codeRowLeft}>
                    <Ionicons name="qr-code-outline" size={15} color={mutedColor} />
                    <Text style={[poppins, styles.codeRowLabel, { color: mutedColor }]}>Invite Code:</Text>
                    <Text style={[poppins, styles.codeValue]}>{team.inviteCode}</Text>
                  </View>
                  <Ionicons name="share-social-outline" size={17} color={ACCENT} />
                </TouchableOpacity>
              ) : !isMember ? (
                <TouchableOpacity style={[styles.joinCodeRow, { backgroundColor: ACCENT + '12' }]} onPress={() => router.push('/join-team')}>
                  <Ionicons name="enter-outline" size={16} color={ACCENT} />
                  <Text style={[poppins, styles.joinCodeText, { color: ACCENT }]}>Join with Invite Code →</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Key roles card */}
            {(captain || viceCaptain || keeper) && (
              <View style={[styles.rolesCard, { backgroundColor: cardBg }]}>
                <Text style={[poppins, styles.sectionLabel, { color: mutedColor }]}>KEY ROLES</Text>
                {captain && (
                  <View style={styles.keyRoleRow}>
                    <Ionicons name="star" size={15} color="#f59e0b" />
                    <Text style={[poppins, styles.keyRoleLabel, { color: textColor }]}>Captain</Text>
                    <Text style={[poppins, styles.keyRoleName, { color: '#f59e0b' }]}>{captain.user?.fullName}</Text>
                  </View>
                )}
                {viceCaptain && (
                  <View style={styles.keyRoleRow}>
                    <Ionicons name="ribbon" size={15} color="#3b82f6" />
                    <Text style={[poppins, styles.keyRoleLabel, { color: textColor }]}>Vice Captain</Text>
                    <Text style={[poppins, styles.keyRoleName, { color: '#3b82f6' }]}>{viceCaptain.user?.fullName}</Text>
                  </View>
                )}
                {keeper && (
                  <View style={styles.keyRoleRow}>
                    <Ionicons name="hand-left" size={15} color="#8b5cf6" />
                    <Text style={[poppins, styles.keyRoleLabel, { color: textColor }]}>Keeper</Text>
                    <Text style={[poppins, styles.keyRoleName, { color: '#8b5cf6' }]}>{keeper.user?.fullName}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Members section label */}
            <View style={styles.membersLabelRow}>
              <Text style={[poppins, styles.sectionLabel, { color: mutedColor }]}>MEMBERS ({memberCount})</Text>
              {isAdmin && (
                <Text style={[poppins, styles.adminHint, { color: mutedColor }]}>Long-press to manage</Text>
              )}
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <MemberCard
            member={item}
            isAdmin={isAdmin}
            createdBy={team.createdBy}
            onLongPress={() => openActions(item)}
            onPress={() => item.userId !== myUserId && router.push(`/player/${item.userId}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={() => isMember ? (
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
            <Ionicons name={isAdmin ? 'trash-outline' : 'exit-outline'} size={17} color={ACCENT} />
            <Text style={[poppins, styles.leaveBtnText]}>
              {isAdmin ? 'Delete Team' : 'Leave Team'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.leaveBtn, { borderColor: '#22c55e40' }]} onPress={() => router.push('/join-team')}>
            <Ionicons name="enter-outline" size={17} color="#22c55e" />
            <Text style={[poppins, styles.leaveBtnText, { color: '#22c55e' }]}>Join this Team</Text>
          </TouchableOpacity>
        )}
      />

      {/* Member actions sheet */}
      <MemberActionsModal
        visible={actionsOpen}
        member={selectedMember}
        createdBy={team?.createdBy}
        onClose={() => { setActionsOpen(false); setSelectedMember(null) }}
        onAssignRole={() => { setActionsOpen(false); setRolePickerOpen(true) }}
        onRemove={handleRemoveMember}
      />

      {/* Role picker sheet */}
      <RolePickerModal
        visible={rolePickerOpen}
        member={selectedMember}
        onClose={() => { setRolePickerOpen(false); setSelectedMember(null) }}
        onAssign={handleAssignRole}
        loading={roleLoading}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', flex: 1, marginHorizontal: 12 },

  scroll: { paddingHorizontal: 16, paddingBottom: 48 },

  // header section — gap between cards
  headerSection: { gap: 12, paddingTop: 16, paddingBottom: 12 },

  infoCard: {
    borderRadius: 16, padding: 20, alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  teamIconLarge: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: ACCENT + '15', justifyContent: 'center', alignItems: 'center',
  },
  teamName: { fontSize: 20, fontFamily: 'Poppins_700Bold', textAlign: 'center' },
  teamDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  teamMeta: { flexDirection: 'row', gap: 10, marginTop: 2 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  metaText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  codeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 2,
  },
  codeRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  codeRowLabel: { fontSize: 12 },
  codeValue: { fontSize: 15, fontFamily: 'Poppins_800ExtraBold', color: ACCENT, letterSpacing: 2 },

  rolesCard: {
    borderRadius: 14, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  keyRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  keyRoleLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', width: 90 },
  keyRoleName: { fontSize: 13, fontFamily: 'Poppins_700Bold', flex: 1 },

  sectionLabel: { fontSize: 10, fontFamily: 'Poppins_600SemiBold', letterSpacing: 1.2 },
  membersLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  adminHint: { fontSize: 11 },

  memberCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ACCENT + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  memberAvatarText: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: ACCENT },
  memberInfo: { flex: 1, marginRight: 8 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#111', flexShrink: 1 },
  creatorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#C8102E15', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5,
  },
  creatorBadgeText: { fontSize: 9, fontFamily: 'Poppins_700Bold', color: '#C8102E' },
  memberUsername: { fontSize: 12, color: '#888', marginTop: 1 },
  memberCity: { fontSize: 11, color: '#aaa', marginTop: 1 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  roleText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },

  joinCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 2 },
  joinCodeText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: ACCENT + '40',
  },
  leaveBtnText: { color: ACCENT, fontFamily: 'Poppins_600SemiBold', fontSize: 14 },

  // ── Modals ────────────────────────────────────────────────────────────────

  // flex container so overlay fills screen and sheet sticks to bottom
  modalRoot: { flex: 1, justifyContent: 'flex-end' },

  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
    gap: 8,
  },
  actionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
    gap: 4,
  },

  sheetHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#111', textAlign: 'center', flex: 1 },
  sheetCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  sheetSub: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 4 },

  roleList: { gap: 8 },
  roleOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#f0f0f0',
  },
  roleOptionActive: { borderColor: ACCENT, backgroundColor: ACCENT + '08' },
  roleOptionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  roleOptionInfo: { flex: 1 },
  roleOptionLabel: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  roleOptionDesc: { fontSize: 11, color: '#888', marginTop: 1 },

  actionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  actionIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', flex: 1 },
})
