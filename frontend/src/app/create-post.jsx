import React, { useState } from 'react'
import {
  View, Text as RNText, TouchableOpacity, Image, StyleSheet,
  TextInput, ScrollView, Alert, ActivityIndicator, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSelector } from 'react-redux'
import * as ImagePicker from 'expo-image-picker'
import { createPost } from '../services/api'

const ACCENT = '#C8102E'
const { width: SCREEN_W } = Dimensions.get('window')

const SPORTS = ['CRICKET', 'FOOTBALL', 'BASKETBALL', 'BADMINTON', 'VOLLEYBALL', 'KABADDI', 'TENNIS', 'OTHER']
const SPORT_EMOJI = {
  CRICKET: '🏏', FOOTBALL: '⚽', BASKETBALL: '🏀', BADMINTON: '🏸',
  VOLLEYBALL: '🏐', KABADDI: '🤼', TENNIS: '🎾', OTHER: '🏃',
}

const POST_TYPES = [
  { key: 'PHOTO', icon: 'camera', label: 'Photo', hint: 'Share a photo moment' },
  { key: 'VIDEO', icon: 'videocam', label: 'Video', hint: 'Share a highlight clip' },
  { key: 'REEL', icon: 'film', label: 'Reel', hint: 'Short vertical video' },
]

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

export default function CreatePostScreen() {
  const router = useRouter()
  const theme = useSelector(s => s.user.theme)
  const isDark = theme === 'dark'

  const bg = isDark ? '#111' : '#f5f5f5'
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#aaa' : '#888'
  const borderColor = isDark ? '#2a2a2a' : '#e5e7eb'

  const [type, setType] = useState(null)
  const [media, setMedia] = useState(null)   // { uri, base64, mimeType }
  const [caption, setCaption] = useState('')
  const [sport, setSport] = useState(null)
  const [uploading, setUploading] = useState(false)

  const pickMedia = async (postType) => {
    const isVideo = postType === 'VIDEO' || postType === 'REEL'

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to your media library to pick content.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: isVideo ? ['videos'] : ['images'],
      allowsEditing: true,
      quality: 0.75,
      base64: true,
      ...(isVideo ? { videoMaxDuration: 60 } : {}),
    })

    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    const mimeType = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg')

    setMedia({ uri: asset.uri, base64: asset.base64, mimeType })
    setType(postType)
  }

  const handlePost = async () => {
    if (!media?.base64) return Alert.alert('No media', 'Please pick a photo or video first.')
    if (!type) return

    setUploading(true)
    try {
      await createPost({
        type,
        caption,
        sport: sport || undefined,
        base64: media.base64,
        mimeType: media.mimeType,
      })
      Alert.alert('Posted!', 'Your post is now live in the feed.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (e) {
      Alert.alert('Failed', e.response?.data?.error || 'Could not upload. Check your connection.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: ACCENT }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        {media && (
          <TouchableOpacity
            style={[styles.postBtn, uploading && { opacity: 0.6 }]}
            onPress={handlePost}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.postBtnText}>Post</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>

        {/* Type selector */}
        {!media && (
          <>
            <Text style={[styles.sectionLabel, { color: ACCENT }]}>CHOOSE TYPE</Text>
            <View style={styles.typeGrid}>
              {POST_TYPES.map(pt => (
                <TouchableOpacity
                  key={pt.key}
                  style={[styles.typeCard, { backgroundColor: cardBg, borderColor: type === pt.key ? ACCENT : borderColor }]}
                  onPress={() => pickMedia(pt.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.typeIconWrap, { backgroundColor: ACCENT + '15' }]}>
                    <Ionicons name={pt.icon} size={28} color={ACCENT} />
                  </View>
                  <Text style={[styles.typeLabel, { color: textColor }]}>{pt.label}</Text>
                  <Text style={[styles.typeHint, { color: mutedColor }]}>{pt.hint}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Media preview */}
        {media && (
          <>
            <View style={styles.previewWrap}>
              {type === 'PHOTO'
                ? <Image source={{ uri: media.uri }} style={styles.previewImg} resizeMode="cover" />
                : (
                  <View style={[styles.previewImg, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name={type === 'REEL' ? 'film' : 'videocam'} size={56} color="rgba(255,255,255,0.6)" />
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'Poppins_600SemiBold', marginTop: 10 }}>
                      {type} ready to upload
                    </Text>
                  </View>
                )
              }
              <TouchableOpacity style={styles.changeMediaBtn} onPress={() => setMedia(null)}>
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Poppins_600SemiBold' }}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Caption */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionLabel, { color: ACCENT }]}>CAPTION</Text>
              <TextInput
                style={[styles.captionInput, { color: textColor, borderColor }]}
                placeholder="Write a caption…"
                placeholderTextColor={mutedColor}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={300}
              />
              <Text style={[styles.charCount, { color: mutedColor }]}>{caption.length}/300</Text>
            </View>

            {/* Sport tag */}
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              <Text style={[styles.sectionLabel, { color: ACCENT }]}>SPORT TAG (OPTIONAL)</Text>
              <View style={styles.sportsWrap}>
                {SPORTS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sportChip, { borderColor: sport === s ? ACCENT : borderColor, backgroundColor: sport === s ? ACCENT : 'transparent' }]}
                    onPress={() => setSport(sport === s ? null : s)}
                  >
                    <Text style={[styles.sportChipText, { color: sport === s ? '#fff' : mutedColor }]}>
                      {SPORT_EMOJI[s]} {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Upload button (bottom) */}
            <TouchableOpacity
              style={[styles.uploadBtn, uploading && { opacity: 0.6 }]}
              onPress={handlePost}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator color="#fff" />
                : <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                  <Text style={styles.uploadBtnText}>Upload & Post</Text>
                </>
              }
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 14,
  },
  headerBack: { padding: 4 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontFamily: 'Poppins_700Bold' },
  postBtn: { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  postBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 14 },

  sectionLabel: { fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 1, marginBottom: 10 },

  typeGrid: { flexDirection: 'row', gap: 10 },
  typeCard: {
    flex: 1, borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 8, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  typeIconWrap: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  typeLabel: { fontSize: 13, fontFamily: 'Poppins_700Bold' },
  typeHint: { fontSize: 10, textAlign: 'center', lineHeight: 14 },

  previewWrap: { borderRadius: 16, overflow: 'hidden', position: 'relative' },
  previewImg: { width: '100%', height: SCREEN_W * 0.85, borderRadius: 16 },
  changeMediaBtn: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
  },

  card: { borderRadius: 16, padding: 16 },
  captionInput: {
    minHeight: 80, fontSize: 14, lineHeight: 20,
    textAlignVertical: 'top', borderWidth: 1, borderRadius: 12,
    padding: 12,
  },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 6 },

  sportsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sportChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  sportChipText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },

  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: ACCENT,
    borderRadius: 16, paddingVertical: 15, marginBottom: 20,
  },
  uploadBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
})
