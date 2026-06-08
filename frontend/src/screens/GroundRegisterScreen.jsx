import React, { useState, useRef } from 'react'
import {
  View,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { registerGround as registerGroundAPI, uploadGroundPhoto } from '../services/api'

const ACCENT = '#C8102E'

function Text({ style, ...props }) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, style]} />
}
function TextInput({ style, ...props }) {
  return <RNTextInput {...props} style={[{ fontFamily: 'Poppins_400Regular' }, style]} />
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORTS_LIST = [
  { key: 'CRICKET',     label: 'Cricket',    emoji: '🏏' },
  { key: 'KABADDI',    label: 'Kabaddi',    emoji: '🤼' },
  { key: 'FOOTBALL',   label: 'Football',   emoji: '⚽' },
  { key: 'BADMINTON',  label: 'Badminton',  emoji: '🏸' },
  { key: 'VOLLEYBALL', label: 'Volleyball', emoji: '🏐' },
  { key: 'BASKETBALL', label: 'Basketball', emoji: '🏀' },
  { key: 'TENNIS',     label: 'Tennis',     emoji: '🎾' },
  { key: 'OTHER',      label: 'Other',      emoji: '🏃' },
]

const AMENITIES_LIST = [
  { key: 'lights',        label: 'Floodlights',   icon: 'bulb-outline'  },
  { key: 'parking',       label: 'Parking',       icon: 'car-outline'   },
  { key: 'changing_room', label: 'Changing Room', icon: 'shirt-outline' },
  { key: 'water',         label: 'Water',         icon: 'water-outline' },
]

const SURFACE_TYPES = [
  { key: 'TURF',      label: 'Turf'          },
  { key: 'CONCRETE',  label: 'Concrete'      },
  { key: 'CLAY',      label: 'Clay'          },
  { key: 'SYNTHETIC', label: 'Synthetic'     },
  { key: 'GRASS',     label: 'Natural Grass' },
]

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
]

const STEPS = ['Identity', 'Location', 'Facilities', 'Pricing', 'Photos', 'Review']

// ─── Shared Sub-components ────────────────────────────────────────────────────

function SelectModal({ visible, title, options, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.modalOption}
                onPress={() => { onSelect(opt.key); onClose() }}
              >
                <Text style={styles.modalOptionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

function FieldLabel({ label, required }) {
  return (
    <Text style={styles.label}>
      {label}{required && <Text style={styles.required}> *</Text>}
    </Text>
  )
}

function InputField({ label, required, icon, ...props }) {
  return (
    <View style={styles.fieldGroup}>
      <FieldLabel label={label} required={required} />
      <View style={styles.inputRow}>
        {icon && <Ionicons name={icon} size={18} color={ACCENT} style={styles.inputIcon} />}
        <TextInput style={styles.inputField} {...props} />
      </View>
    </View>
  )
}

function NavRow({ onBack, onNext, nextLabel = 'Next', isSubmit = false, disabled = false }) {
  return (
    <View style={styles.navRow}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} disabled={disabled}>
        <Ionicons name="arrow-back-outline" size={18} color="#555" />
        <Text style={styles.backBtnText}>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.nextBtnSmall, disabled && { opacity: 0.6 }]} onPress={onNext} disabled={disabled}>
        <LinearGradient
          colors={[ACCENT, '#A00D26']}
          style={styles.gradientSmall}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          {isSubmit && (disabled
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          )}
          <Text style={styles.btnText}>{nextLabel}</Text>
          {!isSubmit && <Ionicons name="arrow-forward-outline" size={18} color="#fff" />}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

// ─── Step 1: Identity ─────────────────────────────────────────────────────────

function StepIdentity({ data, onChange, onNext }) {
  const validate = () => {
    if (!data.name?.trim()) return Alert.alert('Required', 'Ground name is required')
    if (!data.contactPhone?.trim()) return Alert.alert('Required', 'Contact phone is required')
    onNext()
  }

  return (
    <View>
      <Text style={styles.stepTitle}>Ground <Text style={styles.stepTitleAccent}>Identity</Text></Text>
      <Text style={styles.stepSub}>Basic information about your ground</Text>

      <Text style={styles.sectionLabel}>General Info</Text>

      <InputField
        label="Ground Name" required icon="business-outline"
        value={data.name}
        onChangeText={(v) => onChange('name', v)}
        placeholder="e.g. Green Field Cricket Ground"
        placeholderTextColor="#bbb"
      />

      <View style={styles.fieldGroup}>
        <FieldLabel label="Description" />
        <View style={[styles.inputRow, { alignItems: 'flex-start', paddingVertical: 10 }]}>
          <Ionicons name="create-outline" size={18} color={ACCENT} style={[styles.inputIcon, { marginTop: 2 }]} />
          <TextInput
            style={[styles.inputField, { minHeight: 80, textAlignVertical: 'top' }]}
            value={data.description}
            onChangeText={(v) => onChange('description', v)}
            placeholder="Describe your ground — facilities, atmosphere, what makes it special..."
            placeholderTextColor="#bbb"
            multiline numberOfLines={4}
          />
        </View>
      </View>

      <InputField
        label="Contact Phone" required icon="call-outline"
        value={data.contactPhone}
        onChangeText={(v) => onChange('contactPhone', v)}
        placeholder="+91 98765 43210"
        placeholderTextColor="#bbb"
        keyboardType="phone-pad"
      />

      <TouchableOpacity style={styles.nextButton} onPress={validate}>
        <LinearGradient colors={[ACCENT, '#A00D26']} style={styles.gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={styles.btnText}>Next: Location</Text>
          <Ionicons name="arrow-forward-outline" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

// ─── Step 2: Location ─────────────────────────────────────────────────────────

function StepLocation({ data, onChange, onNext, onBack }) {
  const [stateModal, setStateModal] = useState(false)
  const [locLoading, setLocLoading] = useState(false)

  const handleUseLocation = async () => {
    setLocLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to auto-fill address.')
        return
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const results = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
      if (results?.length > 0) {
        const place = results[0]
        onChange('state', place.region || '')
        onChange('city', place.city || place.subregion || '')
        onChange('pincode', place.postalCode || '')
        onChange('latitude', String(position.coords.latitude))
        onChange('longitude', String(position.coords.longitude))
      } else {
        Alert.alert('Location Error', 'Could not determine address. Please enter manually.')
      }
    } catch {
      Alert.alert('Error', 'Could not fetch location. Please enter manually.')
    } finally {
      setLocLoading(false)
    }
  }

  const validate = () => {
    if (!data.addressLine?.trim()) return Alert.alert('Required', 'Address is required')
    if (!data.city?.trim()) return Alert.alert('Required', 'City is required')
    if (!data.state?.trim()) return Alert.alert('Required', 'State is required')
    if (!data.pincode?.trim()) return Alert.alert('Required', 'Pincode is required')
    onNext()
  }

  return (
    <View>
      <Text style={styles.stepTitle}>Ground <Text style={styles.stepTitleAccent}>Location</Text></Text>
      <Text style={styles.stepSub}>Where is your ground located?</Text>

      <TouchableOpacity
        style={[styles.locationBtn, locLoading && { opacity: 0.6 }]}
        onPress={handleUseLocation}
        disabled={locLoading}
        activeOpacity={0.75}
      >
        {locLoading
          ? <ActivityIndicator size="small" color={ACCENT} />
          : <Ionicons name="locate-outline" size={18} color={ACCENT} />
        }
        <Text style={styles.locationBtnText}>
          {locLoading ? 'Detecting location...' : 'Use my current location'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Address</Text>

      <InputField
        label="Address Line" required icon="location-outline"
        value={data.addressLine}
        onChangeText={(v) => onChange('addressLine', v)}
        placeholder="Street / Area / Locality"
        placeholderTextColor="#bbb"
      />

      <View style={styles.twoCol}>
        <View style={[styles.fieldGroup, styles.colLeft]}>
          <FieldLabel label="City" required />
          <View style={styles.inputRow}>
            <TextInput style={styles.inputField} value={data.city}
              onChangeText={(v) => onChange('city', v)}
              placeholder="City" placeholderTextColor="#bbb" />
          </View>
        </View>
        <View style={[styles.fieldGroup, styles.colRight]}>
          <FieldLabel label="Pincode" required />
          <View style={styles.inputRow}>
            <TextInput style={styles.inputField} value={data.pincode}
              onChangeText={(v) => onChange('pincode', v)}
              placeholder="6-digit" placeholderTextColor="#bbb"
              keyboardType="numeric" maxLength={6} />
          </View>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel label="State" required />
        <TouchableOpacity style={styles.selectInput} onPress={() => setStateModal(true)}>
          <Ionicons name="map-outline" size={18} color={ACCENT} style={styles.inputIcon} />
          <Text style={[styles.selectText, !data.state && styles.placeholderText]}>
            {data.state || 'Select State'}
          </Text>
          <Ionicons name="chevron-down-outline" size={18} color="#aaa" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>GPS Coordinates</Text>
      <Text style={styles.sectionHint}>Optional — helps players find you on map</Text>

      <View style={styles.twoCol}>
        <View style={[styles.fieldGroup, styles.colLeft]}>
          <FieldLabel label="Latitude" />
          <View style={styles.inputRow}>
            <TextInput style={styles.inputField} value={data.latitude}
              onChangeText={(v) => onChange('latitude', v)}
              placeholder="28.6139" placeholderTextColor="#bbb"
              keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={[styles.fieldGroup, styles.colRight]}>
          <FieldLabel label="Longitude" />
          <View style={styles.inputRow}>
            <TextInput style={styles.inputField} value={data.longitude}
              onChangeText={(v) => onChange('longitude', v)}
              placeholder="77.2090" placeholderTextColor="#bbb"
              keyboardType="decimal-pad" />
          </View>
        </View>
      </View>

      <SelectModal
        visible={stateModal} title="Select State"
        options={INDIAN_STATES.map((s) => ({ key: s, label: s }))}
        onSelect={(v) => onChange('state', v)}
        onClose={() => setStateModal(false)}
      />

      <NavRow onBack={onBack} onNext={validate} />
    </View>
  )
}

// ─── Step 3: Facilities ───────────────────────────────────────────────────────

function StepFacilities({ data, onChange, onNext, onBack }) {
  const [surfaceModal, setSurfaceModal] = useState(false)

  const toggleSport = (key) => {
    const cur = data.supportedSports || []
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
    onChange('supportedSports', next)
    if (cur.includes(key)) {
      const cap = { ...(data.capacity || {}) }
      delete cap[key]
      onChange('capacity', cap)
    }
  }

  const toggleAmenity = (key) => {
    const cur = data.amenities || []
    onChange('amenities', cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key])
  }

  const setCapacity = (sportKey, val) =>
    onChange('capacity', { ...(data.capacity || {}), [sportKey]: val })

  const validate = () => {
    if (!(data.supportedSports || []).length)
      return Alert.alert('Required', 'Select at least one sport')
    onNext()
  }

  const selectedSports = data.supportedSports || []
  const selectedAmenities = data.amenities || []

  return (
    <View>
      <Text style={styles.stepTitle}>Sports & <Text style={styles.stepTitleAccent}>Facilities</Text></Text>
      <Text style={styles.stepSub}>What does your ground offer?</Text>

      <Text style={styles.sectionLabel}>Supported Sports *</Text>
      <View style={styles.chipsWrap}>
        {SPORTS_LIST.map((sport) => {
          const active = selectedSports.includes(sport.key)
          return (
            <TouchableOpacity key={sport.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleSport(sport.key)}>
              <RNText style={styles.chipEmoji}>{sport.emoji}</RNText>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {sport.label}
              </Text>
              {active && <Ionicons name="checkmark-circle" size={13} color={ACCENT} style={{ marginLeft: 2 }} />}
            </TouchableOpacity>
          )
        })}
      </View>

      {selectedSports.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Capacity per Sport</Text>
          <Text style={styles.sectionHint}>Max players per session</Text>
          {selectedSports.map((key) => {
            const sport = SPORTS_LIST.find((s) => s.key === key)
            return (
              <View key={key} style={styles.capacityRow}>
                <RNText style={styles.capacityEmoji}>{sport.emoji}</RNText>
                <Text style={styles.capacityLabel}>{sport.label}</Text>
                <TextInput
                  style={styles.capacityInput}
                  value={(data.capacity || {})[key] || ''}
                  onChangeText={(v) => setCapacity(key, v)}
                  placeholder="e.g. 22"
                  placeholderTextColor="#bbb"
                  keyboardType="numeric"
                />
              </View>
            )
          })}
        </>
      )}

      <Text style={styles.sectionLabel}>Surface Type</Text>
      <View style={styles.fieldGroup}>
        <TouchableOpacity style={styles.selectInput} onPress={() => setSurfaceModal(true)}>
          <Ionicons name="layers-outline" size={18} color={ACCENT} style={styles.inputIcon} />
          <Text style={[styles.selectText, !data.surfaceType && styles.placeholderText]}>
            {SURFACE_TYPES.find((s) => s.key === data.surfaceType)?.label || 'Select Surface Type'}
          </Text>
          <Ionicons name="chevron-down-outline" size={18} color="#aaa" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Ground Type</Text>
      <View style={styles.radioRow}>
        {[
          { key: false, label: 'Outdoor', icon: 'sunny-outline' },
          { key: true,  label: 'Indoor',  icon: 'home-outline'  },
        ].map(({ key, label, icon }) => {
          const active = data.isIndoor === key
          return (
            <TouchableOpacity key={String(key)}
              style={[styles.radioChip, active && styles.chipActive]}
              onPress={() => onChange('isIndoor', key)}>
              <Ionicons name={icon} size={16} color={active ? ACCENT : '#888'} />
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={styles.sectionLabel}>Amenities</Text>
      <View style={styles.chipsWrap}>
        {AMENITIES_LIST.map((amenity) => {
          const active = selectedAmenities.includes(amenity.key)
          return (
            <TouchableOpacity key={amenity.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleAmenity(amenity.key)}>
              <Ionicons name={amenity.icon} size={15} color={active ? ACCENT : '#888'} />
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {amenity.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <SelectModal
        visible={surfaceModal} title="Select Surface Type"
        options={SURFACE_TYPES}
        onSelect={(v) => onChange('surfaceType', v)}
        onClose={() => setSurfaceModal(false)}
      />

      <NavRow onBack={onBack} onNext={validate} />
    </View>
  )
}

// ─── Step 4: Pricing & Policies ───────────────────────────────────────────────

function StepPricing({ data, onChange, onNext, onBack }) {
  const validate = () => {
    if (!data.pricePerHour?.trim()) return Alert.alert('Required', 'Price per hour is required')
    if (isNaN(parseFloat(data.pricePerHour))) return Alert.alert('Invalid', 'Enter a valid price')
    onNext()
  }

  return (
    <View>
      <Text style={styles.stepTitle}>Pricing & <Text style={styles.stepTitleAccent}>Policies</Text></Text>
      <Text style={styles.stepSub}>Set your rates and ground rules</Text>

      <Text style={styles.sectionLabel}>Pricing</Text>

      <View style={styles.fieldGroup}>
        <FieldLabel label="Price Per Hour (INR)" required />
        <View style={styles.inputRow}>
          <Text style={styles.currencySign}>₹</Text>
          <TextInput
            style={styles.inputField}
            value={data.pricePerHour}
            onChangeText={(v) => onChange('pricePerHour', v)}
            placeholder="500"
            placeholderTextColor="#bbb"
            keyboardType="decimal-pad"
          />
          <Text style={styles.perHourTag}>/ hr</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Policies</Text>

      <View style={styles.fieldGroup}>
        <FieldLabel label="Ground Rules" />
        <View style={[styles.inputRow, { alignItems: 'flex-start', paddingVertical: 10 }]}>
          <Ionicons name="document-text-outline" size={18} color={ACCENT} style={[styles.inputIcon, { marginTop: 2 }]} />
          <TextInput
            style={[styles.inputField, { minHeight: 80, textAlignVertical: 'top' }]}
            value={data.rules}
            onChangeText={(v) => onChange('rules', v)}
            placeholder="e.g. No alcohol, no smoking, proper sports footwear required..."
            placeholderTextColor="#bbb"
            multiline numberOfLines={4}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel label="Cancellation Policy" />
        <View style={[styles.inputRow, { alignItems: 'flex-start', paddingVertical: 10 }]}>
          <Ionicons name="shield-outline" size={18} color={ACCENT} style={[styles.inputIcon, { marginTop: 2 }]} />
          <TextInput
            style={[styles.inputField, { minHeight: 80, textAlignVertical: 'top' }]}
            value={data.cancellationPolicy}
            onChangeText={(v) => onChange('cancellationPolicy', v)}
            placeholder="e.g. Full refund if cancelled 24 hours before booking..."
            placeholderTextColor="#bbb"
            multiline numberOfLines={4}
          />
        </View>
      </View>

      <NavRow onBack={onBack} onNext={validate} />
    </View>
  )
}

// ─── Step 5: Photos ───────────────────────────────────────────────────────────
// Each entry in `photos` is either:
//   { id, localUri, uploading: true }            — in-flight
//   { id, localUri, url: <cloudinary_url> }      — done
//   { id, localUri, error: true }                — failed

function StepPhotos({ data, onChange, onNext, onBack }) {
  const photos = data.photos || []
  const anyUploading = photos.some((p) => p?.uploading)

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to add ground photos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
      selectionLimit: 8 - photos.length,
    })
    if (result.canceled) return

    // Add placeholder entries immediately so the user sees their picks
    const newEntries = result.assets.map((a) => ({
      id: `${Date.now()}_${Math.random()}`,
      localUri: a.uri,
      uploading: true,
    }))
    const merged = [...photos, ...newEntries].slice(0, 8)
    onChange('photos', merged)

    // Upload each in parallel
    for (const asset of result.assets.slice(0, 8 - photos.length)) {
      const entry = newEntries.find((e) => e.localUri === asset.uri)
      if (!entry) continue
      try {
        const mimeType = asset.mimeType || 'image/jpeg'
        const res = await uploadGroundPhoto(asset.base64, mimeType)
        onChange('photos', (prev) =>
          (prev || []).map((p) =>
            p?.id === entry.id ? { ...p, uploading: false, url: res.url } : p
          )
        )
      } catch {
        onChange('photos', (prev) =>
          (prev || []).map((p) =>
            p?.id === entry.id ? { ...p, uploading: false, error: true } : p
          )
        )
      }
    }
  }

  const removePhoto = (id) =>
    onChange('photos', (photos || []).filter((p) => p?.id !== id))

  const handleNext = () => {
    if (anyUploading) {
      Alert.alert('Please wait', 'Photos are still uploading…')
      return
    }
    const failed = photos.filter((p) => p?.error)
    if (failed.length > 0) {
      Alert.alert('Upload failed', `${failed.length} photo(s) failed to upload. Remove them and try again.`)
      return
    }
    onNext()
  }

  return (
    <View>
      <Text style={styles.stepTitle}>Ground <Text style={styles.stepTitleAccent}>Photos</Text></Text>
      <Text style={styles.stepSub}>Great photos attract 3× more bookings</Text>

      <Text style={styles.sectionLabel}>Upload Photos</Text>
      <Text style={styles.sectionHint}>Up to 8 photos — first photo becomes the cover</Text>

      <TouchableOpacity
        style={[styles.photoPickerBtn, (photos.length >= 8 || anyUploading) && styles.photoPickerDisabled]}
        onPress={photos.length < 8 && !anyUploading ? pickImages : undefined}
        activeOpacity={photos.length >= 8 || anyUploading ? 1 : 0.7}
      >
        <View style={styles.photoPickerIconWrap}>
          <Ionicons name="camera-outline" size={26} color={ACCENT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.photoPickerTitle}>
            {anyUploading ? 'Uploading photos…' : photos.length === 0 ? 'Choose from Gallery' : 'Add More Photos'}
          </Text>
          <Text style={styles.photoPickerSub}>
            {photos.length >= 8 ? 'Maximum 8 photos reached' : `${photos.length}/8 photos added`}
          </Text>
        </View>
        {anyUploading
          ? <ActivityIndicator size="small" color={ACCENT} />
          : photos.length < 8 && <Ionicons name="chevron-forward-outline" size={18} color="#bbb" />
        }
      </TouchableOpacity>

      {photos.length > 0 ? (
        <View style={styles.photosGrid}>
          {photos.map((photo, idx) => {
            if (!photo) return null
            const displayUri = photo.localUri
            const isUploading = photo.uploading
            const isError = photo.error
            return (
              <View key={photo.id} style={styles.photoThumb}>
                <Image source={{ uri: displayUri }} style={[styles.photoImg, (isUploading || isError) && { opacity: 0.5 }]} contentFit="cover" />
                {idx === 0 && !isUploading && !isError && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
                {isUploading && (
                  <View style={styles.photoOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                {isError && (
                  <View style={[styles.photoOverlay, { backgroundColor: 'rgba(200,16,46,0.7)' }]}>
                    <Ionicons name="alert-circle" size={22} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 9, marginTop: 2 }}>Failed</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => removePhoto(photo.id)}>
                  <Ionicons name="close-circle" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      ) : (
        <View style={styles.photoEmptyState}>
          <Ionicons name="images-outline" size={52} color="#ddd" />
          <Text style={styles.photoEmptyTitle}>No photos yet</Text>
          <Text style={styles.photoEmptyHint}>
            Grounds with photos get booked significantly faster
          </Text>
        </View>
      )}

      <NavRow onBack={onBack} onNext={handleNext} nextLabel="Next: Review" disabled={anyUploading} />
    </View>
  )
}

// ─── Step 6: Review & Submit ──────────────────────────────────────────────────

function StepReview({ identity, location, facilities, pricing, media, onBack, onSubmit, submitted, submitting }) {
  if (submitted) {
    return (
      <View style={styles.successWrap}>
        <View style={styles.successIconBg}>
          <Ionicons name="checkmark-circle" size={60} color={ACCENT} />
        </View>
        <Text style={styles.successTitle}>Ground Registered!</Text>
        <Text style={styles.successSub}>
          Submitted for admin verification. You'll be notified once it goes live.
        </Text>
        <View style={styles.successFeatures}>
          {[
            { icon: 'shield-checkmark-outline', text: 'Under Admin Review'           },
            { icon: 'notifications-outline',    text: 'Notification on Approval'     },
            { icon: 'calendar-outline',         text: 'Slots Enabled After Approval' },
          ].map((f) => (
            <View key={f.text} style={styles.successFeatureRow}>
              <View style={styles.featureIconBg}>
                <Ionicons name={f.icon} size={18} color={ACCENT} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const ReviewRow = ({ label, value }) =>
    value ? (
      <View style={styles.reviewRow}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue}>{String(value)}</Text>
      </View>
    ) : null

  const selectedSportObjs = (facilities.supportedSports || [])
    .map((k) => SPORTS_LIST.find((s) => s.key === k))
    .filter(Boolean)

  const photos = media.photos || []

  return (
    <View>
      <Text style={styles.stepTitle}>Review & <Text style={styles.stepTitleAccent}>Submit</Text></Text>
      <Text style={styles.stepSub}>Confirm your ground details before submitting</Text>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewCardTitle}>Ground Identity</Text>
        <ReviewRow label="Name"        value={identity.name} />
        <ReviewRow label="Phone"       value={identity.contactPhone} />
        <ReviewRow label="Description" value={identity.description} />
      </View>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewCardTitle}>Location</Text>
        <ReviewRow label="Address"  value={location.addressLine} />
        <ReviewRow label="City"     value={location.city} />
        <ReviewRow label="State"    value={location.state} />
        <ReviewRow label="Pincode"  value={location.pincode} />
        {(location.latitude || location.longitude) && (
          <ReviewRow label="GPS" value={`${location.latitude}, ${location.longitude}`} />
        )}
      </View>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewCardTitle}>Sports & Facilities</Text>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Sports</Text>
          <View style={styles.reviewChipsWrap}>
            {selectedSportObjs.map((s) => (
              <View key={s.key} style={styles.reviewChip}>
                <RNText>{s.emoji}</RNText>
                <Text style={styles.reviewChipText}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <ReviewRow
          label="Surface"
          value={SURFACE_TYPES.find((s) => s.key === facilities.surfaceType)?.label}
        />
        <ReviewRow label="Type"      value={facilities.isIndoor ? 'Indoor' : 'Outdoor'} />
        {(facilities.amenities || []).length > 0 && (
          <ReviewRow
            label="Amenities"
            value={(facilities.amenities || [])
              .map((k) => AMENITIES_LIST.find((a) => a.key === k)?.label)
              .filter(Boolean)
              .join(', ')}
          />
        )}
      </View>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewCardTitle}>Pricing & Policies</Text>
        <ReviewRow label="Price/Hour"   value={pricing.pricePerHour ? `₹${pricing.pricePerHour}` : null} />
        <ReviewRow label="Rules"        value={pricing.rules} />
        <ReviewRow label="Cancellation" value={pricing.cancellationPolicy} />
      </View>

      {photos.length > 0 && (
        <View style={styles.reviewCard}>
          <Text style={styles.reviewCardTitle}>Photos ({photos.filter(p => p?.url).length} uploaded)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            {photos.map((photo, idx) => {
              if (!photo) return null
              const displayUri = photo.url || photo.localUri
              return (
                <View key={photo.id} style={styles.reviewPhoto}>
                  <Image source={{ uri: displayUri }} style={styles.reviewPhotoImg} contentFit="cover" />
                  {idx === 0 && photo.url && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </ScrollView>
        </View>
      )}

      <NavRow onBack={onBack} onNext={onSubmit} nextLabel={submitting ? 'Submitting...' : 'Submit'} isSubmit disabled={submitting} />
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const GroundRegisterScreen = () => {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const scrollRef = useRef(null)

  const [identity,   setIdentity]   = useState({ name: '', description: '', contactPhone: '' })
  const [location,   setLocation]   = useState({ addressLine: '', city: '', state: '', pincode: '', latitude: '', longitude: '' })
  const [facilities, setFacilities] = useState({ supportedSports: [], surfaceType: '', isIndoor: false, amenities: [], capacity: {} })
  const [pricing,    setPricing]    = useState({ pricePerHour: '', rules: '', cancellationPolicy: '' })
  const [media,      setMedia]      = useState({ photos: [] })

  const patch = (setter) => (key, val) =>
    setter((prev) => ({ ...prev, [key]: typeof val === 'function' ? val(prev[key]) : val }))
  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true })
  const goNext = () => { setStep((s) => s + 1); scrollTop() }
  const goBack = () => { setStep((s) => s - 1); scrollTop() }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // Extract only successfully uploaded Cloudinary URLs
      const uploadedPhotos = (media.photos || [])
        .filter((p) => p?.url)
        .map((p) => p.url)
      const payload = {
        ...identity,
        ...location,
        ...facilities,
        ...pricing,
        photos: uploadedPhotos,
      }
      const result = await registerGroundAPI(payload)
      if (result.success) {
        setSubmitted(true)
      } else {
        Alert.alert('Error', result.error || 'Registration failed')
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Could not connect to server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={ACCENT} barStyle="light-content" />

      {/* ── Sticky header ── */}
      <View style={styles.stickyHeader}>
        <LinearGradient colors={[ACCENT, '#a00d24']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.pBadge}>
              <Text style={styles.pLetter}>P</Text>
              <Ionicons name="walk" size={11} color="#fff" style={styles.pRunner} />
            </View>
            <Text style={styles.brandRow}>
              <Text style={styles.brandPlay}>PLAY</Text>
              <Text style={styles.brandConnect}>CONNECT</Text>
            </Text>
            <Text style={styles.tagline}>
              {'STOP VIRTUAL GAMES. START '}
              <Text style={styles.taglineAccent}>REAL BATTLES.</Text>
            </Text>
          </View>
        </LinearGradient>

        {/* Step indicator */}
        <View style={styles.stepBar}>
          <View style={styles.stepRow}>
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepCircle, step > i && styles.stepDone, step === i && styles.stepActive]}>
                    <Text style={styles.stepCircleText}>{step > i ? '✓' : i + 1}</Text>
                  </View>
                  <Text style={[styles.stepLabel, step >= i && styles.stepLabelActive]}>{label}</Text>
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepLine, step > i && styles.stepLineDone]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>

      {/* Scrollable form */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.card}>
            {step === 0 && <StepIdentity   data={identity}   onChange={patch(setIdentity)}   onNext={goNext} />}
            {step === 1 && <StepLocation   data={location}   onChange={patch(setLocation)}   onNext={goNext} onBack={goBack} />}
            {step === 2 && <StepFacilities data={facilities} onChange={patch(setFacilities)} onNext={goNext} onBack={goBack} />}
            {step === 3 && <StepPricing    data={pricing}    onChange={patch(setPricing)}    onNext={goNext} onBack={goBack} />}
            {step === 4 && <StepPhotos     data={media}      onChange={patch(setMedia)}      onNext={goNext} onBack={goBack} />}
            {step === 5 && (
              <StepReview
                identity={identity} location={location}
                facilities={facilities} pricing={pricing} media={media}
                onBack={goBack} onSubmit={handleSubmit}
                submitted={submitted} submitting={submitting}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#efefef' },

  // ── Header ──
  stickyHeader: { zIndex: 100, backgroundColor: '#efefef' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 16,
    zIndex: 10,
    padding: 4,
  },
  headerContent: { alignItems: 'center' },
  pBadge: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  pLetter: { fontSize: 28, fontFamily: 'Poppins_800ExtraBold', color: '#fff', lineHeight: 34 },
  pRunner: { position: 'absolute', bottom: 5, right: 5 },
  brandRow: { fontSize: 22, marginBottom: 3 },
  brandPlay:    { fontFamily: 'Poppins_800ExtraBold', color: '#fff' },
  brandConnect: { fontFamily: 'Poppins_800ExtraBold', color: 'rgba(255,255,255,0.75)' },
  tagline: {
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 14,
  },
  taglineAccent: { color: '#fff', fontFamily: 'Poppins_700Bold' },

  // ── Step bar ──
  stepBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  stepItem: { alignItems: 'center', width: 50 },
  stepCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  stepActive: { backgroundColor: ACCENT },
  stepDone:   { backgroundColor: ACCENT },
  stepCircleText: { fontSize: 11, fontFamily: 'Poppins_700Bold', color: '#fff' },
  stepLabel:       { fontSize: 9, color: '#bbb', textAlign: 'center', marginTop: 4, fontFamily: 'Poppins_400Regular' },
  stepLabelActive: { color: ACCENT, fontFamily: 'Poppins_600SemiBold' },
  stepLine:     { flex: 1, height: 2, backgroundColor: '#f0f0f0', marginHorizontal: 2, marginTop: 12 },
  stepLineDone: { backgroundColor: ACCENT },

  // ── Card / Body ──
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 14,
  },

  // ── Step title / sub ──
  stepTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#111',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 2,
  },
  stepTitleAccent: { color: ACCENT },
  stepSub: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHint: { fontSize: 12, color: '#bbb', marginTop: -8, marginBottom: 14, fontFamily: 'Poppins_400Regular' },

  // ── Field / label ──
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#111', marginBottom: 7 },
  required: { color: ACCENT },

  // ── Input row (matches RegisterScreen) ──
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    minHeight: 48,
  },
  inputIcon: { marginRight: 8 },
  inputField: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Poppins_400Regular',
  },

  // ── Select ──
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    backgroundColor: '#fafafa',
    minHeight: 48,
  },
  selectText:      { flex: 1, fontSize: 14, color: '#333', fontFamily: 'Poppins_400Regular' },
  placeholderText: { color: '#bbb' },

  // ── Two-col layout ──
  twoCol:   { flexDirection: 'row' },
  colLeft:  { flex: 1, marginRight: 6 },
  colRight: { flex: 1, marginLeft: 6 },

  // ── Pricing ──
  currencySign: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: ACCENT, marginRight: 4 },
  perHourTag:   { fontSize: 13, color: '#aaa', fontFamily: 'Poppins_400Regular', marginLeft: 4 },

  // ── Location button ──
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff5f7',
    borderWidth: 1.5,
    borderColor: ACCENT + '30',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  locationBtnText: { fontSize: 13, color: ACCENT, fontFamily: 'Poppins_600SemiBold' },

  // ── Chips ──
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    backgroundColor: '#fafafa',
    gap: 6,
  },
  chipActive:      { borderColor: ACCENT, backgroundColor: '#fff0f2' },
  chipEmoji:       { fontSize: 15 },
  chipLabel:       { fontSize: 13, color: '#555', fontFamily: 'Poppins_400Regular' },
  chipLabelActive: { color: ACCENT, fontFamily: 'Poppins_600SemiBold' },

  // ── Capacity ──
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 10,
  },
  capacityEmoji: { fontSize: 20 },
  capacityLabel: { flex: 1, fontSize: 14, color: '#333', fontFamily: 'Poppins_400Regular' },
  capacityInput: {
    width: 68,
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    fontFamily: 'Poppins_400Regular',
  },

  // ── Radio chips ──
  radioRow:  { flexDirection: 'row', gap: 12, marginBottom: 18 },
  radioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    backgroundColor: '#fafafa',
    gap: 6,
  },

  // ── Nav row ──
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 22,
    gap: 12,
  },
  backBtn: {
    height: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  backBtnText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#555' },
  nextBtnSmall: { height: 48, flex: 1, borderRadius: 12, overflow: 'hidden' },
  gradientSmall: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_700Bold', lineHeight: 20 },

  // ── First-step full-width next ──
  nextButton: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  gradient: { paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    width: '82%',
    maxHeight: '62%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  modalTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#111', marginBottom: 14, textAlign: 'center' },
  modalOption: { paddingVertical: 13, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  modalOptionText: { fontSize: 14, color: '#333', fontFamily: 'Poppins_400Regular', textAlign: 'center' },

  // ── Photos ──
  photoPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  photoPickerDisabled: { opacity: 0.5 },
  photoPickerIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff0f2', justifyContent: 'center', alignItems: 'center' },
  photoPickerTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#222' },
  photoPickerSub:   { fontSize: 11.5, color: '#aaa', marginTop: 2, fontFamily: 'Poppins_400Regular' },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  photoThumb: { width: '30%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  photoImg:   { width: '100%', height: '100%' },
  coverBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: ACCENT, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  coverBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_700Bold' },
  photoRemoveBtn: { position: 'absolute', top: 4, right: 4 },
  photoOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', borderRadius: 10,
  },

  photoEmptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
    borderStyle: 'dashed',
    marginBottom: 18,
  },
  photoEmptyTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#ccc', marginTop: 12 },
  photoEmptyHint:  { fontSize: 12, color: '#ccc', marginTop: 4, textAlign: 'center', paddingHorizontal: 24, fontFamily: 'Poppins_400Regular' },

  // ── Review ──
  reviewCard: {
    backgroundColor: '#fafafa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
  },
  reviewCardTitle: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  reviewRow:       { flexDirection: 'row', marginBottom: 8, gap: 8 },
  reviewLabel:     { fontSize: 12, color: '#888', width: 88, fontFamily: 'Poppins_400Regular' },
  reviewValue:     { flex: 1, fontSize: 13, color: '#222', fontFamily: 'Poppins_500Medium' },
  reviewChipsWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0f2',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    gap: 4,
  },
  reviewChipText: { fontSize: 12, color: ACCENT, fontFamily: 'Poppins_500Medium' },
  reviewPhoto:    { width: 90, height: 90, borderRadius: 10, overflow: 'hidden', marginRight: 10 },
  reviewPhotoImg: { width: '100%', height: '100%' },

  // ── Success ──
  successWrap: { alignItems: 'center', paddingVertical: 40 },
  successIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff0f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  successTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: '#111', marginTop: 14, marginBottom: 10, textAlign: 'center' },
  successSub: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 32, paddingHorizontal: 16, fontFamily: 'Poppins_400Regular' },
  successFeatures:    { width: '100%', gap: 10 },
  successFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
  },
  featureIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff0f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: { fontSize: 13, color: '#444', fontFamily: 'Poppins_500Medium' },
})

export default GroundRegisterScreen
