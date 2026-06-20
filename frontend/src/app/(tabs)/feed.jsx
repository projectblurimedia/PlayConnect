import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text as RNText, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, RefreshControl, TextInput,
  Modal, Alert, ScrollView, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import { getFeed, togglePostLike, getPostComments, addPostComment, deletePost } from '../../services/api'

const ACCENT = '#C8102E'
const { width: SCREEN_W } = Dimensions.get('window')

const SPORT_EMOJI = {
  CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', BADMINTON: '🏸',
  VOLLEYBALL: '🏐', KABADDI: '🤼', TENNIS: '🎾', OTHER: '🏃',
}

const FILTERS = [
  { key: null, label: 'All' },
  { key: 'PHOTO', label: '📷 Photos' },
  { key: 'VIDEO', label: '🎬 Videos' },
  { key: 'REEL', label: '🎞️ Reels' },
]

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function Avatar({ url, name, size = 38 }) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontFamily: 'Poppins_700Bold' }}>{initials}</Text>
    </View>
  )
}

function CommentsModal({ visible, postId, onClose, cardBg, textColor, mutedColor, borderColor, isDark }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  useFocusEffect(useCallback(() => {
    if (!visible || !postId) return
    setLoading(true)
    getPostComments(postId)
      .then(d => { setComments(d.comments || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [visible, postId]))

  const submit = async () => {
    if (!text.trim()) return
    setPosting(true)
    try {
      const d = await addPostComment(postId, text)
      setComments(c => [...c, d.comment])
      setText('')
    } catch {}
    setPosting(false)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: borderColor, alignSelf: 'center', marginTop: 14, marginBottom: 16 }} />
          <Text style={{ fontSize: 15, fontFamily: 'Poppins_700Bold', color: textColor, paddingHorizontal: 18, marginBottom: 12 }}>
            Comments
          </Text>
          {loading
            ? <ActivityIndicator color={ACCENT} style={{ paddingVertical: 32 }} />
            : (
              <ScrollView style={{ paddingHorizontal: 18 }} showsVerticalScrollIndicator={false}>
                {comments.length === 0
                  ? <Text style={{ color: mutedColor, textAlign: 'center', paddingVertical: 24 }}>No comments yet. Be first!</Text>
                  : comments.map(c => (
                    <View key={c.id} style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                      <Avatar url={c.author.profilePhotoUrl} name={c.author.fullName} size={34} />
                      <View style={{ flex: 1, backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5', borderRadius: 12, padding: 10 }}>
                        <Text style={{ fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: textColor }}>{c.author.fullName}</Text>
                        <Text style={{ fontSize: 13, color: textColor, marginTop: 2 }}>{c.text}</Text>
                        <Text style={{ fontSize: 10, color: mutedColor, marginTop: 4 }}>{timeAgo(c.createdAt)}</Text>
                      </View>
                    </View>
                  ))
                }
              </ScrollView>
            )
          }
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: borderColor }}>
            <TextInput
              style={{ flex: 1, backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, color: textColor, fontFamily: 'Poppins_400Regular', fontSize: 13 }}
              placeholder="Add a comment…"
              placeholderTextColor={mutedColor}
              value={text}
              onChangeText={setText}
              returnKeyType="send"
              onSubmitEditing={submit}
            />
            <TouchableOpacity onPress={submit} disabled={posting || !text.trim()}>
              {posting
                ? <ActivityIndicator size="small" color={ACCENT} />
                : <Ionicons name="send" size={22} color={text.trim() ? ACCENT : mutedColor} />
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function PostCard({ post, onComment, onDelete, myUserId, cardBg, textColor, mutedColor, borderColor, isDark }) {
  const [liked, setLiked] = useState(post.isLiked)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const isMyPost = post.author.id === myUserId

  const handleLike = async () => {
    const prev = liked
    setLiked(!prev)
    setLikesCount(c => prev ? c - 1 : c + 1)
    try {
      const d = await togglePostLike(post.id)
      setLiked(d.liked)
      setLikesCount(d.likesCount)
    } catch {
      setLiked(prev)
      setLikesCount(c => prev ? c + 1 : c - 1)
    }
  }

  const mediaH = post.type === 'REEL' ? SCREEN_W * 1.2 : SCREEN_W * 0.85

  return (
    <View style={[styles.postCard, { backgroundColor: cardBg }]}>
      <View style={styles.postHeader}>
        <Avatar url={post.author.profilePhotoUrl} name={post.author.fullName} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.postAuthor, { color: textColor }]}>{post.author.fullName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.postTime, { color: mutedColor }]}>{timeAgo(post.createdAt)}</Text>
            {post.sport && (
              <View style={[styles.sportTag, { backgroundColor: ACCENT + '15' }]}>
                <Text style={[styles.sportTagText, { color: ACCENT }]}>{SPORT_EMOJI[post.sport]} {post.sport}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
          <Text style={{ fontSize: 10, fontFamily: 'Poppins_600SemiBold', color: mutedColor }}>
            {post.type === 'PHOTO' ? '📷' : post.type === 'VIDEO' ? '🎬' : '🎞️'}
          </Text>
        </View>
        {isMyPost && (
          <TouchableOpacity
            onPress={() => Alert.alert('Delete Post', 'Remove this post?', [
              { text: 'Cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(post.id) },
            ])}
            style={{ padding: 6, marginLeft: 2 }}
          >
            <Ionicons name="trash-outline" size={16} color={mutedColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Media */}
      <View style={{ height: mediaH, backgroundColor: '#111' }}>
        {post.type === 'PHOTO'
          ? <Image source={{ uri: post.mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {(post.thumbnailUrl || post.mediaUrl) && (
                <Image source={{ uri: post.thumbnailUrl || post.mediaUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              )}
              <View style={styles.playOverlay}>
                <Ionicons name={post.type === 'REEL' ? 'play-circle' : 'play-circle-outline'} size={68} color="rgba(255,255,255,0.92)" />
                <Text style={{ color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginTop: 6, letterSpacing: 1 }}>
                  {post.type}
                </Text>
              </View>
            </View>
          )
        }
      </View>

      {/* Actions */}
      <View style={[styles.postActions, { borderTopColor: borderColor }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#ef4444' : mutedColor} />
          <Text style={[styles.actionCount, { color: liked ? '#ef4444' : mutedColor }]}>{likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(post.id)}>
          <Ionicons name="chatbubble-outline" size={21} color={mutedColor} />
          <Text style={[styles.actionCount, { color: mutedColor }]}>{post.commentsCount}</Text>
        </TouchableOpacity>
      </View>

      {post.caption ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Text style={{ color: textColor, fontSize: 13, lineHeight: 19 }}>
            <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>{post.author.username}{'  '}</Text>
            {post.caption}
          </Text>
        </View>
      ) : <View style={{ height: 6 }} />}
    </View>
  )
}

export default function FeedScreen() {
  const router = useRouter()
  const theme = useSelector(s => s.user.theme)
  const myUser = useSelector(s => s.user.user)
  const isDark = theme === 'dark'

  const bg = isDark ? '#111' : '#f0f0f0'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'
  const borderColor = isDark ? '#2a2a2a' : '#e5e7eb'

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState(null)
  const [commentPostId, setCommentPostId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getFeed(1, filter)
      setPosts(data.posts || [])
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleDelete = async (postId) => {
    try {
      await deletePost(postId)
      setPosts(p => p.filter(x => x.id !== postId))
    } catch {
      Alert.alert('Error', 'Could not delete post')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Filter bar */}
      <View style={[styles.filterRow, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={String(f.key)}
            style={[styles.filterChip, filter === f.key && { backgroundColor: ACCENT }]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, { color: filter === f.key ? '#fff' : mutedColor }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color={ACCENT} style={{ marginTop: 60 }} size="large" />
        : (
          <FlatList
            data={posts}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <PostCard
                post={item}
                onComment={setCommentPostId}
                onDelete={handleDelete}
                myUserId={myUser?.id}
                cardBg={cardBg}
                textColor={textColor}
                mutedColor={mutedColor}
                borderColor={borderColor}
                isDark={isDark}
              />
            )}
            contentContainerStyle={{ paddingVertical: 6, gap: 6 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load() }}
                tintColor={ACCENT}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="play-circle-outline" size={64} color="#ccc" />
                <Text style={[styles.emptyTitle, { color: mutedColor }]}>No posts yet</Text>
                <Text style={[styles.emptyHint, { color: mutedColor }]}>Share your first photo, video or reel!</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-post')}>
                  <Text style={styles.createBtnText}>Create Post</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )
      }

      {/* Floating create button */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-post')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <CommentsModal
        visible={!!commentPostId}
        postId={commentPostId}
        onClose={() => setCommentPostId(null)}
        cardBg={cardBg}
        textColor={textColor}
        mutedColor={mutedColor}
        borderColor={borderColor}
        isDark={isDark}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 10,
    gap: 6, borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  filterChipText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },

  postCard: { overflow: 'hidden' },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 10 },
  postAuthor: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
  postTime: { fontSize: 11 },
  sportTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sportTagText: { fontSize: 10, fontFamily: 'Poppins_600SemiBold' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  postActions: {
    flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10,
    gap: 20, borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  emptyBox: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', marginTop: 16 },
  emptyHint: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  createBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: ACCENT, borderRadius: 24 },
  createBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },

  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: ACCENT,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 8,
  },
})
