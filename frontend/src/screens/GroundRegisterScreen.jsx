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
import { registerGround as registerGroundAPI } from '../services/api'

const ACCENT = '#C8102E'
const poppinsTextStyle = { fontFamily: 'Poppins_400Regular' }

function Text({ style, ...props }) {
  return <RNText {...props} style={[poppinsTextStyle, style]} />
}
function TextInput({ style, ...props }) {
  return <RNTextInput {...props} style={[poppinsTextStyle, style]} />
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
    <Text style={styles.fieldLabel}>
      {label}{required && <Text style={styles.required}> *</Text>}
    </Text>
  )
}

function InputField({ label, required, icon, ...props }) {
  return (
    <View style={styles.fieldGroup}>
      <FieldLabel label={label} required={required} />
      <View style={styles.inputContainer}>
        {icon && (
          <View style={styles.inputIconWrap}>
            <Ionicons name={icon} size={18} color="#888" />
          </View>
        )}
        <TextInput style={[styles.input, icon && styles.inputShifted]} {...props} />
      </View>
    </View>
  )
}

function NavRow({ onBack, onNext, nextLabel = 'Next', isSubmit = false, disabled = false }) {
  return (
    <View style={styles.navRow}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} disabled={disabled}>
        <Ionicons name="arrow-back-outline" size={18} color={ACCENT} />
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
      <Text style={styles.stepTitle}>Ground Identity</Text>
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
        <TextInput
          style={styles.textarea}
          value={data.description}
          onChangeText={(v) => onChange('description', v)}
          placeholder="Describe your ground — facilities, atmosphere, what makes it special..."
          placeholderTextColor="#bbb"
          multiline numberOfLines={4}
          textAlignVertical="top"
        />
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
      <Text style={styles.stepTitle}>Location</Text>
      <Text style={styles.stepSub}>Where is your ground located?</Text>

      {/* Auto-fill location button */}
      <TouchableOpacity
        style={styles.locationBtn}
        onPress={handleUseLocation}
        disabled={locLoading}
        activeOpacity={0.75}
      >
        {locLoading
          ? <ActivityIndicator size="small" color={ACCENT} />
          : <Ionicons name="location" size={18} color={ACCENT} />
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
          <View style={styles.inputContainer}>
            <TextInput style={styles.input} value={data.city}
              onChangeText={(v) => onChange('city', v)}
              placeholder="City" placeholderTextColor="#bbb" />
          </View>
        </View>
        <View style={[styles.fieldGroup, styles.colRight]}>
          <FieldLabel label="Pincode" required />
          <View style={styles.inputContainer}>
            <TextInput style={styles.input} value={data.pincode}
              onChangeText={(v) => onChange('pincode', v)}
              placeholder="6-digit" placeholderTextColor="#bbb"
              keyboardType="numeric" maxLength={6} />
          </View>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel label="State" required />
        <TouchableOpacity style={styles.selectInput} onPress={() => setStateModal(true)}>
          <Text style={[styles.selectText, !data.state && styles.placeholderText]}>
            {data.state || 'Select State'}
          </Text>
          <Ionicons name="chevron-down-outline" size={18} color="#888" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>GPS Coordinates</Text>
      <Text style={styles.sectionHint}>Optional — helps players find you on map</Text>

      <View style={styles.twoCol}>
        <View style={[styles.fieldGroup, styles.colLeft]}>
          <FieldLabel label="Latitude" />
          <View style={styles.inputContainer}>
            <TextInput style={styles.input} value={data.latitude}
              onChangeText={(v) => onChange('latitude', v)}
              placeholder="28.6139" placeholderTextColor="#bbb"
              keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={[styles.fieldGroup, styles.colRight]}>
          <FieldLabel label="Longitude" />
          <View style={styles.inputContainer}>
            <TextInput style={styles.input} value={data.longitude}
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
      <Text style={styles.stepTitle}>Sports & Facilities</Text>
      <Text style={styles.stepSub}>What does your ground offer?</Text>

      <Text style={styles.sectionLabel}>Supported Sports *</Text>
      <View style={styles.chipsWrap}>
        {SPORTS_LIST.map((sport) => {
          const active = selectedSports.includes(sport.key)
          return (
            <TouchableOpacity key={sport.key}
              style={[styles.sportChip, active && styles.chipActive]}
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
          <Text style={[styles.selectText, !data.surfaceType && styles.placeholderText]}>
            {SURFACE_TYPES.find((s) => s.key === data.surfaceType)?.label || 'Select Surface Type'}
          </Text>
          <Ionicons name="chevron-down-outline" size={18} color="#888" />
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
              style={[styles.amenityChip, active && styles.chipActive]}
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
      <Text style={styles.stepTitle}>Pricing & Policies</Text>
      <Text style={styles.stepSub}>Set your rates and ground rules</Text>

      <Text style={styles.sectionLabel}>Pricing</Text>

      <View style={styles.fieldGroup}>
        <FieldLabel label="Price Per Hour (INR)" required />
        <View style={styles.inputContainer}>
          <View style={styles.inputIconWrap}>
            <Text style={styles.currencySign}>₹</Text>
          </View>
          <TextInput
            style={[styles.input, styles.inputShifted]}
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
        <TextInput
          style={styles.textarea}
          value={data.rules}
          onChangeText={(v) => onChange('rules', v)}
          placeholder="e.g. No alcohol, no smoking, proper sports footwear required..."
          placeholderTextColor="#bbb"
          multiline numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.fieldGroup}>
        <FieldLabel label="Cancellation Policy" />
        <TextInput
          style={styles.textarea}
          value={data.cancellationPolicy}
          onChangeText={(v) => onChange('cancellationPolicy', v)}
          placeholder="e.g. Full refund if cancelled 24 hours before booking..."
          placeholderTextColor="#bbb"
          multiline numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <NavRow onBack={onBack} onNext={validate} />
    </View>
  )
}

// ─── Step 5: Photos ───────────────────────────────────────────────────────────

function StepPhotos({ data, onChange, onNext, onBack }) {
  const photos = data.photos || []

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to add ground photos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 8 - photos.length,
    })
    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri)
      onChange('photos', [...photos, ...newUris].slice(0, 8))
    }
  }

  const removePhoto = (uri) =>
    onChange('photos', photos.filter((u) => u !== uri))

  return (
    <View>
      <Text style={styles.stepTitle}>Ground Photos</Text>
      <Text style={styles.stepSub}>Great photos attract 3× more bookings</Text>

      <Text style={styles.sectionLabel}>Upload Photos</Text>
      <Text style={styles.sectionHint}>Up to 8 photos — first photo becomes the cover</Text>

      {/* Picker button */}
      <TouchableOpacity
        style={[styles.photoPickerBtn, photos.length >= 8 && styles.photoPickerDisabled]}
        onPress={photos.length < 8 ? pickImages : undefined}
        activeOpacity={photos.length >= 8 ? 1 : 0.7}
      >
        <View style={styles.photoPickerIconWrap}>
          <Ionicons name="camera-outline" size={26} color={ACCENT} />
        </View>
        <View>
          <Text style={styles.photoPickerTitle}>
            {photos.length === 0 ? 'Choose from Gallery' : `Add More Photos`}
          </Text>
          <Text style={styles.photoPickerSub}>
            {photos.length >= 8 ? 'Maximum 8 photos reached' : `${photos.length}/8 photos added`}
          </Text>
        </View>
        {photos.length < 8 && (
          <Ionicons name="chevron-forward-outline" size={18} color="#bbb" style={{ marginLeft: 'auto' }} />
        )}
      </TouchableOpacity>

      {/* Photo grid */}
      {photos.length > 0 ? (
        <View style={styles.photosGrid}>
          {photos.map((uri, idx) => (
            <View key={uri} style={styles.photoThumb}>
              <Image source={{ uri }} style={styles.photoImg} contentFit="cover" />
              {idx === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>Cover</Text>
                </View>
              )}
              <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => removePhoto(uri)}>
                <Ionicons name="close-circle" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
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

      <NavRow onBack={onBack} onNext={onNext} nextLabel="Next: Review" />
    </View>
  )
}

// ─── Step 6: Review & Submit ──────────────────────────────────────────────────

function StepReview({ identity, location, facilities, pricing, media, onBack, onSubmit, submitted, submitting }) {
  if (submitted) {
    return (
      <View style={styles.successWrap}>
        <Ionicons name="checkmark-circle" size={72} color={ACCENT} />
        <Text style={styles.successTitle}>Ground Registered!</Text>
        <Text style={styles.successSub}>
          Submitted for admin verification. You'll be notified once it goes live.
        </Text>
        <View style={styles.successFeatures}>
          {[
            { icon: 'shield-checkmark-outline', text: 'Under Admin Review'            },
            { icon: 'notifications-outline',    text: 'Notification on Approval'      },
            { icon: 'calendar-outline',         text: 'Slots Enabled After Approval'  },
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
      <Text style={styles.stepTitle}>Review & Submit</Text>
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
          <Text style={styles.reviewCardTitle}>Photos ({photos.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            {photos.map((uri, idx) => (
              <View key={uri} style={styles.reviewPhoto}>
                <Image source={{ uri }} style={styles.reviewPhotoImg} contentFit="cover" />
                {idx === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
              </View>
            ))}
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

  const patch = (setter) => (key, val) => setter((prev) => ({ ...prev, [key]: val }))
  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true })
  const goNext = () => { setStep((s) => s + 1); scrollTop() }
  const goBack = () => { setStep((s) => s - 1); scrollTop() }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload = {
        ...identity,
        ...location,
        ...facilities,
        ...pricing,
        photos: media.photos,
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

      {/* Sticky header — outside ScrollView so it never scrolls */}
      <View style={styles.stickyHeader}>
        <View style={styles.header}>
          {/* Back button */}
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.logoText}>
              PLAY<Text style={styles.logoAccent}>CONNECT</Text>
            </Text>
            <Text style={styles.tagline}>Stop Virtual Games. Start Real Battles.</Text>
            <View style={styles.headerIconsRow}>
              {['🏏','⚽','🏀','🏸','🏐','🎾','🏊','🚴','🏃','🏑','🏓','🤼'].map((icon, i) => (
                <RNText key={i} style={styles.headerIcon}>{icon}</RNText>
              ))}
            </View>
          </View>
        </View>

        {/* Step indicator */}
        <View style={styles.stepBar}>
          <View style={styles.stepRow}>
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepCircle,
                    step > i  && styles.stepDone,
                    step === i && styles.stepActive,
                  ]}>
                    <Text style={styles.stepCircleText}>{step > i ? '✓' : i + 1}</Text>
                  </View>
                  <Text style={[styles.stepLabel, step >= i && styles.stepLabelActive]}>
                    {label}
                  </Text>
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.body}>
            {step === 0 && <StepIdentity   data={identity}   onChange={patch(setIdentity)}   onNext={goNext} />}
            {step === 1 && <StepLocation   data={location}   onChange={patch(setLocation)}   onNext={goNext} onBack={goBack} />}
            {step === 2 && <StepFacilities data={facilities} onChange={patch(setFacilities)} onNext={goNext} onBack={goBack} />}
            {step === 3 && <StepPricing    data={pricing}    onChange={patch(setPricing)}    onNext={goNext} onBack={goBack} />}
            {step === 4 && <StepPhotos     data={media}      onChange={patch(setMedia)}      onNext={goNext} onBack={goBack} />}
            {step === 5 && (
              <StepReview
                identity={identity} location={location}
                facilities={facilities} pricing={pricing} media={media}
                onBack={goBack}
                onSubmit={handleSubmit}
                submitted={submitted}
                submitting={submitting}
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  // ── Header ──
  stickyHeader: { zIndex: 100, backgroundColor: '#fff' },
  header: {
    backgroundColor: ACCENT,
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 45,
    paddingBottom: 16,
  },
  headerBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 45,
    left: 16,
    zIndex: 10,
    padding: 4,
  },
  headerContent: { alignItems: 'center' },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  logoAccent: { opacity: 0.85 },
  tagline: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
    textAlign: 'center',
  },
  headerIconsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    opacity: 0.5,
  },
  headerIcon: { fontSize: 16 },

  // ── Step indicator ──
  stepBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  stepItem: { alignItems: 'center', width: 50 },
  stepCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#ebebeb',
    justifyContent: 'center', alignItems: 'center',
  },
  stepActive: { backgroundColor: ACCENT },
  stepDone:   { backgroundColor: ACCENT },
  stepCircleText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  stepLabel:      { fontSize: 9, color: '#bbb', textAlign: 'center', marginTop: 4 },
  stepLabelActive: { color: ACCENT, fontWeight: '600' },
  stepLine:     { flex: 1, height: 2, backgroundColor: '#ebebeb', marginHorizontal: 2, marginTop: 12 },
  stepLineDone: { backgroundColor: ACCENT },

  // ── Scroll body ──
  scrollView:    { flex: 1 },
  scrollContent: { flexGrow: 1 },
  body:          { padding: 20, paddingBottom: 48 },

  // ── Step header text ──
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 4 },
  stepSub:   { fontSize: 14, color: '#666', marginBottom: 24 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: ACCENT,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 12, marginTop: 8,
  },
  sectionHint: { fontSize: 12, color: '#999', marginTop: -8, marginBottom: 14 },

  // ── Location button ──
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ACCENT + '12',
    borderWidth: 1.5, borderColor: ACCENT + '40',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
    marginBottom: 20,
  },
  locationBtnText: { fontSize: 14, color: ACCENT, fontFamily: 'Poppins_600SemiBold' },

  // ── Form fields ──
  fieldGroup:    { marginBottom: 16 },
  fieldLabel:    { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  required:      { color: ACCENT },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  inputIconWrap: { paddingLeft: 14, paddingRight: 4 },
  input: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 14,
    fontSize: 15, color: '#333',
  },
  inputShifted: { paddingLeft: 6 },
  textarea: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 14, color: '#333', backgroundColor: '#f8f9fa',
    minHeight: 92, textAlignVertical: 'top',
  },
  selectInput: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingVertical: 14, paddingHorizontal: 14,
  },
  selectText:      { fontSize: 15, color: '#333' },
  placeholderText: { color: '#bbb' },
  twoCol:   { flexDirection: 'row' },
  colLeft:  { flex: 1, marginRight: 8 },
  colRight: { flex: 1, marginLeft: 8 },
  currencySign: { fontSize: 17, fontWeight: '700', color: '#555', paddingLeft: 14 },
  perHourTag:   { fontSize: 13, color: '#999', paddingRight: 14 },

  // ── Chips ──
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  sportChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 24,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f8f9fa', gap: 6,
  },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 24,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f8f9fa', gap: 6,
  },
  chipActive:      { borderColor: ACCENT, backgroundColor: '#FFF0F2' },
  chipEmoji:       { fontSize: 15 },
  chipLabel:       { fontSize: 13, color: '#555' },
  chipLabelActive: { color: ACCENT, fontWeight: '600' },

  // ── Capacity ──
  capacityRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 10, gap: 10,
  },
  capacityEmoji: { fontSize: 20 },
  capacityLabel: { flex: 1, fontSize: 14, color: '#333' },
  capacityInput: {
    width: 68, fontSize: 14, color: '#333', textAlign: 'right',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fff',
  },

  // ── Radio ──
  radioRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  radioChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 22, borderRadius: 24,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f8f9fa', gap: 6,
  },

  // ── Navigation — both buttons forced to the same height ──
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'stretch', marginTop: 24, gap: 12,
  },
  backBtn: {
    height: 48,
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12,
    borderWidth: 1.5, borderColor: ACCENT,
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: ACCENT },
  nextBtnSmall: {
    height: 48,
    flex: 1,
    borderRadius: 12, overflow: 'hidden',
  },
  gradientSmall: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 20 },

  // ── First-step full-width next button ──
  nextButton: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  gradient: {
    paddingVertical: 16, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    width: '82%', maxHeight: '62%',
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14, shadowRadius: 20, elevation: 12,
  },
  modalTitle: {
    fontSize: 16, fontWeight: '700', color: '#111',
    marginBottom: 14, textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 13, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  modalOptionText: { fontSize: 15, color: '#333' },

  // ── Photos ──
  photoPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  photoPickerDisabled: { opacity: 0.5 },
  photoPickerIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FFF0F2',
    justifyContent: 'center', alignItems: 'center',
  },
  photoPickerTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  photoPickerSub:   { fontSize: 12, color: '#999', marginTop: 2 },

  photosGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20,
  },
  photoThumb: {
    width: '30%', aspectRatio: 1,
    borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  photoImg:  { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: ACCENT,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  coverBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  photoRemoveBtn: {
    position: 'absolute', top: 4, right: 4,
  },

  photoEmptyState: {
    alignItems: 'center', paddingVertical: 36,
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#f0f0f0',
    borderStyle: 'dashed', marginBottom: 20,
  },
  photoEmptyTitle: { fontSize: 15, fontWeight: '600', color: '#bbb', marginTop: 12 },
  photoEmptyHint:  { fontSize: 12, color: '#ccc', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },

  // ── Review ──
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  reviewCardTitle: {
    fontSize: 12, fontWeight: '700', color: ACCENT,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  reviewRow:       { flexDirection: 'row', marginBottom: 8, gap: 8 },
  reviewLabel:     { fontSize: 13, color: '#999', width: 88 },
  reviewValue:     { flex: 1, fontSize: 13, color: '#222' },
  reviewChipsWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reviewChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF0F2', borderRadius: 20,
    paddingVertical: 3, paddingHorizontal: 10, gap: 4,
  },
  reviewChipText: { fontSize: 12, color: ACCENT },
  reviewPhoto: {
    width: 90, height: 90, borderRadius: 10,
    overflow: 'hidden', marginRight: 10,
  },
  reviewPhotoImg: { width: '100%', height: '100%' },

  // ── Success ──
  successWrap:  { alignItems: 'center', paddingVertical: 48 },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#111', marginTop: 16, marginBottom: 10 },
  successSub: {
    fontSize: 14, color: '#666', textAlign: 'center',
    lineHeight: 22, marginBottom: 36, paddingHorizontal: 16,
  },
  successFeatures:    { width: '100%', gap: 12 },
  successFeatureRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  featureIconBg: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#C8102E15',
    justifyContent: 'center', alignItems: 'center',
  },
  featureText: { fontSize: 14, color: '#444' },
})

export default GroundRegisterScreen
