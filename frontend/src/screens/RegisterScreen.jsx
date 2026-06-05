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
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { useDispatch } from 'react-redux'
import { setUser } from '../store/userSlice'
import { checkUsername as checkUsernameAPI, registerUser, uploadProfilePhoto } from '../services/api'

const poppinsTextStyle = { fontFamily: 'Poppins_400Regular' }

function Text({ style, ...props }) {
  return <RNText {...props} style={[poppinsTextStyle, style]} />
}

function TextInput({ style, ...props }) {
  return <RNTextInput {...props} style={[poppinsTextStyle, style]} />
}

const SPORTS = [
  {
    key: "CRICKET", label: "Cricket", emoji: "🏏",
    subtitle: "Tell us about your cricket profile",
    fields: [
      { id: "playingRole", label: "Playing Role", type: "radio", required: true, options: ["Batsman", "Bowler", "All-Rounder", "Wicket Keeper"] },
      { id: "battingStyle", label: "Batting Style", type: "select", options: ["Right Hand Bat", "Left Hand Bat"] },
      { id: "bowlingStyle", label: "Bowling Style", type: "select", options: ["Right Arm Fast", "Right Arm Medium", "Left Arm Fast", "Left Arm Spin", "Right Arm Spin", "N/A"] },
      { id: "playingLevel", label: "Playing Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced", "Professional"] },
      { id: "yearsExp", label: "Years of Experience", type: "number", required: true },
      { id: "bestPerf", label: "Best Performance", type: "text", placeholder: "Your best performance in cricket" },
      { id: "achievements", label: "Achievements", type: "textarea", placeholder: "List your cricket achievements" },
    ],
  },
  {
    key: "FOOTBALL", label: "Football", emoji: "⚽",
    subtitle: "Tell us about your football profile",
    fields: [
      { id: "primaryPos", label: "Primary Position", type: "select", required: true, options: ["Goalkeeper", "Defender", "Midfielder", "Forward", "Winger"] },
      { id: "secondaryPos", label: "Secondary Position", type: "select", options: ["Goalkeeper", "Defender", "Midfielder", "Forward", "Winger", "None"] },
      { id: "preferredFoot", label: "Preferred Foot", type: "select", options: ["Right", "Left", "Both"] },
      { id: "playingLevel", label: "Playing Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced", "Professional"] },
      { id: "yearsExp", label: "Years of Experience", type: "number", required: true },
      { id: "bestAchievement", label: "Best Achievement", type: "text", placeholder: "Your best achievement in football" },
      { id: "achievements", label: "Achievements", type: "textarea", placeholder: "List your football achievements" },
    ],
  },
  {
    key: "BADMINTON", label: "Badminton", emoji: "🏸",
    subtitle: "Tell us about your badminton profile",
    fields: [
      { id: "playingStyle", label: "Playing Style", type: "select", required: true, options: ["Aggressive", "Defensive", "All-Round"] },
      { id: "preferredHand", label: "Preferred Hand", type: "select", options: ["Right", "Left"] },
      { id: "playingLevel", label: "Playing Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced", "Professional"] },
      { id: "yearsExp", label: "Years of Experience", type: "number", required: true },
      { id: "bestAchievement", label: "Best Achievement", type: "text", placeholder: "Your best achievement in badminton" },
      { id: "achievements", label: "Achievements", type: "textarea", placeholder: "List your badminton achievements" },
    ],
  },
  {
    key: "BASKETBALL", label: "Basketball", emoji: "🏀",
    subtitle: "Tell us about your basketball profile",
    fields: [
      { id: "primaryPos", label: "Primary Position", type: "select", required: true, options: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"] },
      { id: "secondaryPos", label: "Secondary Position", type: "select", options: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center", "None"] },
      { id: "playingStyle", label: "Playing Style", type: "select", options: ["Offensive", "Defensive", "All-Round"] },
      { id: "playingLevel", label: "Playing Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced", "Professional"] },
      { id: "yearsExp", label: "Years of Experience", type: "number", required: true },
      { id: "bestAchievement", label: "Best Achievement", type: "text", placeholder: "Your best achievement in basketball" },
      { id: "achievements", label: "Achievements", type: "textarea", placeholder: "List your basketball achievements" },
    ],
  },
  {
    key: "VOLLEYBALL", label: "Volleyball", emoji: "🏐",
    subtitle: "Tell us about your volleyball profile",
    fields: [
      { id: "primaryPos", label: "Primary Position", type: "select", required: true, options: ["Setter", "Libero", "Outside Hitter", "Opposite Hitter", "Middle Blocker"] },
      { id: "secondaryPos", label: "Secondary Position", type: "select", options: ["Setter", "Libero", "Outside Hitter", "Opposite Hitter", "Middle Blocker", "None"] },
      { id: "playingStyle", label: "Playing Style", type: "select", options: ["Power", "Technical", "All-Round"] },
      { id: "playingLevel", label: "Playing Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced", "Professional"] },
      { id: "yearsExp", label: "Years of Experience", type: "number", required: true },
      { id: "bestAchievement", label: "Best Achievement", type: "text", placeholder: "Your best achievement in volleyball" },
      { id: "achievements", label: "Achievements", type: "textarea", placeholder: "List your volleyball achievements" },
    ],
  },
  {
    key: "KABADDI", label: "Kabaddi", emoji: "🤼",
    subtitle: "Tell us about your kabaddi profile",
    fields: [
      { id: "playingPos", label: "Playing Position", type: "select", required: true, options: ["Raider", "Defender", "All-Rounder"] },
      { id: "playingStyle", label: "Playing Style", type: "select", options: ["Aggressive Raider", "Corner Defender", "Cover Defender"] },
      { id: "playingLevel", label: "Playing Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced", "Professional"] },
      { id: "yearsExp", label: "Years of Experience", type: "number", required: true },
      { id: "bestAchievement", label: "Best Achievement", type: "text", placeholder: "Your best achievement in kabaddi" },
      { id: "achievements", label: "Achievements", type: "textarea", placeholder: "List your kabaddi achievements" },
    ],
  },
  {
    key: "TENNIS", label: "Tennis", emoji: "🎾",
    subtitle: "Tell us about your tennis profile",
    fields: [
      { id: "playingStyle", label: "Playing Style", type: "select", required: true, options: ["Baseliner", "Serve & Volley", "All-Court"] },
      { id: "preferredHand", label: "Preferred Hand", type: "select", options: ["Right", "Left"] },
      { id: "playingLevel", label: "Playing Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced", "Professional"] },
      { id: "yearsExp", label: "Years of Experience", type: "number", required: true },
      { id: "bestAchievement", label: "Best Achievement", type: "text", placeholder: "Your best achievement in tennis" },
      { id: "achievements", label: "Achievements", type: "textarea", placeholder: "List your tennis achievements" },
    ],
  },
  {
    key: "TABLE_TENNIS", label: "Table Tennis", emoji: "🏓",
    subtitle: "Tell us about your table tennis profile",
    fields: [
      { id: "playingStyle", label: "Playing Style", type: "select", required: true, options: ["Attacker", "Defender", "All-Round"] },
      { id: "preferredHand", label: "Preferred Hand", type: "select", options: ["Right", "Left"] },
      { id: "playingLevel", label: "Playing Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced", "Professional"] },
      { id: "yearsExp", label: "Years of Experience", type: "number", required: true },
      { id: "bestAchievement", label: "Best Achievement", type: "text", placeholder: "Your best achievement in table tennis" },
      { id: "achievements", label: "Achievements", type: "textarea", placeholder: "List your table tennis achievements" },
    ],
  },
  {
    key: "HOCKEY", label: "Hockey", emoji: "🏑",
    subtitle: "Tell us about your hockey profile",
    fields: [
      { id: "playingPos", label: "Playing Position", type: "select", required: true, options: ["Goalkeeper", "Defender", "Midfielder", "Forward"] },
      { id: "playingStyle", label: "Playing Style", type: "select", options: ["Aggressive", "Defensive", "All-Round"] },
      { id: "playingLevel", label: "Playing Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced", "Professional"] },
      { id: "yearsExp", label: "Years of Experience", type: "number", required: true },
      { id: "bestAchievement", label: "Best Achievement", type: "text", placeholder: "Your best achievement in hockey" },
      { id: "achievements", label: "Achievements", type: "textarea", placeholder: "List your hockey achievements" },
    ],
  },
  {
    key: "RUNNING", label: "Running", emoji: "🏃",
    subtitle: "Tell us about your running profile",
    fields: [
      { id: "runningType", label: "Running Type", type: "select", required: true, options: ["Sprint", "Middle Distance", "Long Distance", "Marathon", "Trail Running"] },
      { id: "bestCategory", label: "Best Category", type: "select", options: ["100m", "200m", "400m", "800m", "1500m", "5K", "10K", "Half Marathon", "Full Marathon"] },
      { id: "yearsExp", label: "Years of Experience", type: "number", required: true },
      { id: "bestAchievement", label: "Best Achievement", type: "text", placeholder: "Your best achievement in running" },
      { id: "achievements", label: "Achievements", type: "textarea", placeholder: "List your running achievements" },
    ],
  },
  {
    key: "CYCLING", label: "Cycling", emoji: "🚴",
    subtitle: "Tell us about your cycling profile",
    fields: [
      { id: "cyclingType", label: "Cycling Type", type: "select", required: true, options: ["Road Cycling", "Mountain Biking", "Track Cycling", "BMX"] },
      { id: "yearsExp", label: "Years of Experience", type: "number", required: true },
      { id: "bestAchievement", label: "Best Achievement", type: "text", placeholder: "Your best achievement in cycling" },
      { id: "achievements", label: "Achievements", type: "textarea", placeholder: "List your cycling achievements" },
    ],
  },
  {
    key: "SWIMMING", label: "Swimming", emoji: "🏊",
    subtitle: "Tell us about your swimming profile",
    fields: [
      { id: "swimmingStyle", label: "Swimming Style", type: "select", required: true, options: ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Individual Medley"] },
      { id: "yearsExp", label: "Years of Experience", type: "number", required: true },
      { id: "bestAchievement", label: "Best Achievement", type: "text", placeholder: "Your best achievement in swimming" },
      { id: "achievements", label: "Achievements", type: "textarea", placeholder: "List your swimming achievements" },
    ],
  },
]

const STEPS = ["Profile", "Sports", "Complete"]

function SportField({ field, value, onChange }) {
  const [showPicker, setShowPicker] = useState(false)

  if (field.type === "radio") {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{field.label}{field.required && <Text style={styles.required}> *</Text>}</Text>
        <View style={styles.radioRow}>
          {field.options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.radioBtn, value === opt && styles.radioBtnSelected]}
              onPress={() => onChange(opt)}
            >
              <Text style={[styles.radioText, value === opt && styles.radioTextSelected]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  }

  if (field.type === "select") {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{field.label}{field.required && <Text style={styles.required}> *</Text>}</Text>
        <TouchableOpacity style={styles.select} onPress={() => setShowPicker(true)}>
          <Text style={[styles.selectText, !value && styles.placeholderText]}>
            {value || `Select ${field.label.toLowerCase()}`}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
        </TouchableOpacity>
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select {field.label}</Text>
              <ScrollView style={styles.modalOptions}>
                {field.options.map((opt) => (
                  <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => { onChange(opt); setShowPicker(false) }}>
                    <Text style={styles.modalOptionText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    )
  }

  if (field.type === "textarea") {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{field.label}{field.required && <Text style={styles.required}> *</Text>}</Text>
        <TextInput
          style={styles.textarea}
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
          placeholderTextColor="#999"
          value={value || ""}
          onChangeText={onChange}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    )
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{field.label}{field.required && <Text style={styles.required}> *</Text>}</Text>
      <TextInput
        style={styles.input}
        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
        placeholderTextColor="#999"
        value={value || ""}
        onChangeText={onChange}
        keyboardType={field.type === "number" ? "numeric" : "default"}
      />
    </View>
  )
}

function StepProfile({ data, onChange, onNext }) {
  const router = useRouter()
  const [errors, setErrors] = useState({})
  const [usernameStatus, setUsernameStatus] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [photoUri, setPhotoUri] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const usernameTimer = useRef(null)

  const handleUsernameChange = (text) => {
    onChange('username', text)
    setUsernameStatus(null)
    if (errors.username) setErrors(prev => ({ ...prev, username: '' }))
    if (usernameTimer.current) clearTimeout(usernameTimer.current)
    const trimmed = text.trim()
    if (trimmed.length >= 3) {
      setUsernameStatus('checking')
      usernameTimer.current = setTimeout(async () => {
        try {
          const result = await checkUsernameAPI(trimmed)
          setUsernameStatus(result.available ? 'available' : 'taken')
        } catch {
          setUsernameStatus(null)
        }
      }, 250)
    }
  }

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setPhotoUri(asset.uri)
      setPhotoUploading(true)
      try {
        const uploadResult = await uploadProfilePhoto(asset.base64)
        if (uploadResult.success) {
          onChange('profilePhotoUrl', uploadResult.url)
          Alert.alert('Success', 'Profile photo uploaded!')
        } else {
          Alert.alert('Upload Failed', uploadResult.error || 'Could not upload photo.')
          setPhotoUri(null)
        }
      } catch {
        Alert.alert('Upload Error', 'Could not upload photo. You can skip for now.')
        setPhotoUri(null)
      } finally {
        setPhotoUploading(false)
      }
    }
  }

  const handleUseLocation = async () => {
    setLocationLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.')
        return
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const results = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
      if (results?.length > 0) {
        const place = results[0]
        onChange('country', place.country || 'India')
        onChange('state', place.region || '')
        onChange('city', place.city || place.subregion || '')
        onChange('area', place.district || place.street || '')
        onChange('pincode', place.postalCode || '')
        onChange('latitude', position.coords.latitude)
        onChange('longitude', position.coords.longitude)
      } else {
        Alert.alert('Location Error', 'Could not determine address. Please enter manually.')
      }
    } catch {
      Alert.alert('Error', 'Could not fetch location. Please enter manually.')
    } finally {
      setLocationLoading(false)
    }
  }

  const renderUsernameIcon = () => {
    if (usernameStatus === 'checking') return <ActivityIndicator size="small" color="#888" style={styles.usernameIcon} />
    if (usernameStatus === 'available') return <Ionicons name="checkmark-circle" size={22} color="#22c55e" style={styles.usernameIcon} />
    if (usernameStatus === 'taken') return <Ionicons name="close-circle" size={22} color="#C8102E" style={styles.usernameIcon} />
    return null
  }

  const validate = () => {
    const e = {}
    if (!data.fullName?.trim()) e.fullName = "Full name is required"
    if (!data.username?.trim()) e.username = "Username is required"
    else if (usernameStatus === 'taken') e.username = "Username already taken"
    else if (usernameStatus === 'checking') e.username = "Wait for username check"
    if (!data.phone?.trim()) e.phone = "Phone number is required"
    if (!data.password?.trim()) e.password = "Password is required"
    else if (data.password.length < 6) e.password = "Password must be at least 6 characters"
    if (!data.dob?.trim()) e.dob = "Date of birth is required (YYYY-MM-DD)"
    if (!data.gender) e.gender = "Please select a gender"
    if (!data.country?.trim()) e.country = "Country is required"
    if (!data.state?.trim()) e.state = "State is required"
    if (!data.city?.trim()) e.city = "City is required"
    if (!data.pincode?.trim()) e.pincode = "Pin code is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const locationFields = [
    { id: "country", label: "Country", placeholder: "Enter your country", required: true },
    { id: "state", label: "State", placeholder: "Enter your state", required: true },
    { id: "city", label: "City", placeholder: "Enter your city", required: true },
    { id: "area", label: "Area / Locality", placeholder: "Enter your area or locality" },
    { id: "pincode", label: "Pin Code", placeholder: "Enter pin code", required: true },
  ]

  return (
    <View>
      <Text style={styles.pageTitle}>Create Your Account</Text>
      <Text style={styles.pageSub}>Join the sports community and start your journey</Text>
      <Text style={styles.sectionLabel}>Basic Information</Text>

      {/* Profile Photo */}
      <TouchableOpacity style={styles.photoUpload} onPress={handlePickPhoto} disabled={photoUploading}>
        {photoUploading ? (
          <ActivityIndicator size="small" color="#C8102E" />
        ) : photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <>
            <Text style={styles.photoIcon}>📷</Text>
            <Text style={styles.photoText}>Upload your profile picture</Text>
          </>
        )}
        {photoUri && !photoUploading && (
          <Text style={styles.photoChangeText}>Tap to change</Text>
        )}
      </TouchableOpacity>

      {/* Full Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Full Name<Text style={styles.required}> *</Text></Text>
        <TextInput
          style={[styles.input, errors.fullName && styles.inputError]}
          placeholder="Enter your full name"
          placeholderTextColor="#999"
          value={data.fullName || ''}
          onChangeText={(text) => { onChange('fullName', text); if (errors.fullName) setErrors(p => ({ ...p, fullName: '' })) }}
        />
        {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
      </View>

      {/* Username */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Username<Text style={styles.required}> *</Text></Text>
        <View style={styles.inputWithIcon}>
          <TextInput
            style={[styles.input, styles.inputFlex, errors.username && styles.inputError]}
            placeholder="Choose a unique username"
            placeholderTextColor="#999"
            value={data.username || ''}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {renderUsernameIcon()}
        </View>
        {errors.username ? <Text style={styles.errorText}>{errors.username}</Text>
          : usernameStatus === 'available' ? <Text style={styles.successText}>Username is available</Text>
          : usernameStatus === 'taken' ? <Text style={styles.errorText}>Username already taken</Text>
          : null}
      </View>

      {/* Phone */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Phone Number<Text style={styles.required}> *</Text></Text>
        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          placeholder="+91 Enter your phone number"
          placeholderTextColor="#999"
          value={data.phone || ''}
          onChangeText={(text) => { onChange('phone', text); if (errors.phone) setErrors(p => ({ ...p, phone: '' })) }}
          keyboardType="phone-pad"
        />
        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
      </View>

      {/* Password */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Password<Text style={styles.required}> *</Text></Text>
        <View style={styles.inputWithIcon}>
          <TextInput
            style={[styles.input, styles.inputFlex, errors.password && styles.inputError]}
            placeholder="Create a password (min 6 chars)"
            placeholderTextColor="#999"
            value={data.password || ''}
            onChangeText={(text) => { onChange('password', text); if (errors.password) setErrors(p => ({ ...p, password: '' })) }}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.usernameIcon}>
            <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="#888" />
          </TouchableOpacity>
        </View>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
      </View>

      {/* Email */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#999"
          value={data.email || ''}
          onChangeText={(text) => onChange('email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* DOB */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Date of Birth<Text style={styles.required}> *</Text></Text>
        <TextInput
          style={[styles.input, errors.dob && styles.inputError]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
          value={data.dob || ''}
          onChangeText={(text) => { onChange('dob', text); if (errors.dob) setErrors(p => ({ ...p, dob: '' })) }}
        />
        {errors.dob ? <Text style={styles.errorText}>{errors.dob}</Text> : null}
      </View>

      {/* Gender */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Gender<Text style={styles.required}> *</Text></Text>
        <View style={styles.radioRow}>
          {["Male", "Female", "Other"].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.radioBtn, data.gender === g && styles.radioBtnSelected]}
              onPress={() => { onChange("gender", g); if (errors.gender) setErrors(p => ({ ...p, gender: '' })) }}
            >
              <Text style={[styles.radioText, data.gender === g && styles.radioTextSelected]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>LOCATION</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.locationButton, locationLoading && styles.locationButtonDisabled]}
        onPress={handleUseLocation}
        disabled={locationLoading}
      >
        {locationLoading
          ? <ActivityIndicator size="small" color="#C8102E" />
          : <Ionicons name="location" size={20} color="#C8102E" />
        }
        <Text style={styles.locationButtonText}>
          {locationLoading ? 'Fetching location...' : 'Use current location'}
        </Text>
      </TouchableOpacity>

      {locationFields.map((f) => (
        <View key={f.id} style={styles.fieldGroup}>
          <Text style={styles.label}>{f.label}{f.required && <Text style={styles.required}> *</Text>}</Text>
          <TextInput
            style={[styles.input, errors[f.id] && styles.inputError]}
            placeholder={f.placeholder}
            placeholderTextColor="#999"
            value={data[f.id] || ""}
            onChangeText={(text) => { onChange(f.id, text); if (errors[f.id]) setErrors(p => ({ ...p, [f.id]: '' })) }}
            keyboardType={f.id === 'pincode' ? 'numeric' : 'default'}
          />
          {errors[f.id] ? <Text style={styles.errorText}>{errors[f.id]}</Text> : null}
        </View>
      ))}

      <View style={styles.loginLink}>
        <Text style={styles.loginLinkText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.loginAnchor}>Login</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.nextButtonStandalone} onPress={() => { if (validate()) onNext() }}>
        <LinearGradient colors={['#C8102E', '#A00D26']} style={styles.gradient}>
          <Text style={styles.nextButtonText}>Next: Choose Sport</Text>
          <Ionicons name="arrow-forward-outline" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

function StepSports({ selectedSports, sportData, onToggle, onSportChange, onNext, onBack }) {
  const [errors, setErrors] = useState("")

  const handleNext = () => {
    if (selectedSports.length === 0) { setErrors("Please select at least one sport"); return }
    setErrors("")
    onNext()
  }

  return (
    <View>
      <Text style={styles.pageTitle}>Choose Your Primary Sport</Text>
      <Text style={styles.pageSub}>Select your main sport to customize your profile</Text>

      <View style={styles.sportGrid}>
        {SPORTS.map((sport) => {
          const isSelected = selectedSports.includes(sport.key)
          return (
            <TouchableOpacity
              key={sport.key}
              style={[styles.sportCard, isSelected && styles.sportCardSelected]}
              onPress={() => onToggle(sport.key)}
            >
              {isSelected && <View style={styles.sportCheck}><Text style={styles.sportCheckText}>✓</Text></View>}
              <Text style={styles.sportEmoji}>{sport.emoji}</Text>
              <Text style={[styles.sportName, isSelected && styles.sportNameSelected]}>{sport.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {errors ? <Text style={styles.errorText}>{errors}</Text> : null}

      {selectedSports.map((key) => {
        const sport = SPORTS.find((s) => s.key === key)
        if (!sport) return null
        return (
          <View key={key} style={styles.sportFormCard}>
            <View style={styles.sportFormHeader}>
              <Text style={styles.sportFormEmoji}>{sport.emoji}</Text>
              <View>
                <Text style={styles.sportFormTitle}>{sport.label}</Text>
                <Text style={styles.sportFormSubtitle}>{sport.subtitle}</Text>
              </View>
            </View>
            {sport.fields.map((field) => (
              <SportField
                key={field.id}
                field={field}
                value={sportData[key]?.[field.id]}
                onChange={(val) => onSportChange(key, field.id, val)}
              />
            ))}
          </View>
        )
      })}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back-outline" size={18} color="#555" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <LinearGradient colors={['#C8102E', '#A00D26']} style={styles.gradient}>
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward-outline" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function StepReview({ profileData, selectedSports, sportData, onBack, onSubmit, isSubmitting }) {
  const initials = (profileData.fullName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const primarySport = SPORTS.find((s) => s.key === selectedSports[0])

  return (
    <View>
      <Text style={styles.pageTitle}>Review Your Details</Text>
      <Text style={styles.pageSub}>Please review your information before submitting</Text>

      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          {profileData.profilePhotoUrl
            ? <Image source={{ uri: profileData.profilePhotoUrl }} style={styles.reviewPhoto} />
            : (
              <View style={styles.reviewAvatar}>
                <Text style={styles.reviewAvatarText}>{initials}</Text>
              </View>
            )
          }
          <View>
            <Text style={styles.reviewName}>{profileData.fullName || "—"}</Text>
            <Text style={styles.reviewHandle}>@{profileData.username || "—"}</Text>
          </View>
        </View>
        <View style={styles.reviewBody}>
          {[
            { icon: "📱", key: "Phone", val: profileData.phone || "—" },
            { icon: "🎂", key: "Date of Birth", val: profileData.dob || "—" },
            { icon: "👤", key: "Gender", val: profileData.gender || "—" },
            { icon: "📍", key: "Location", val: [profileData.city, profileData.state, profileData.country].filter(Boolean).join(', ') || "—" },
            { icon: "⚽", key: "Sport", val: primarySport ? `${primarySport.emoji} ${primarySport.label}${selectedSports.length > 1 ? ` +${selectedSports.length - 1} more` : ""}` : "—" },
            { icon: "📊", key: "Playing Level", val: (primarySport && sportData[primarySport.key]?.playingLevel) || "—" },
            { icon: "⏱️", key: "Experience", val: (primarySport && sportData[primarySport.key]?.yearsExp) ? `${sportData[primarySport.key].yearsExp} years` : "—" },
          ].map((r) => (
            <View key={r.key} style={styles.reviewRow}>
              <Text style={styles.reviewIcon}>{r.icon}</Text>
              <View>
                <Text style={styles.reviewKey}>{r.key}</Text>
                <Text style={styles.reviewVal}>{r.val}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.reviewButtonRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={isSubmitting}>
          <Ionicons name="arrow-back-outline" size={18} color="#555" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient colors={['#C8102E', '#A00D26']} style={styles.gradient}>
            {isSubmitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            }
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function RegisterScreen() {
  const router = useRouter()
  const dispatch = useDispatch()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const scrollViewRef = useRef()

  const [profileData, setProfileData] = useState({})
  const [selectedSports, setSelectedSports] = useState([])
  const [sportData, setSportData] = useState({})

  const handleProfileChange = (key, val) => setProfileData((prev) => ({ ...prev, [key]: val }))

  const toggleSport = (key) => {
    setSelectedSports((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])
  }

  const handleSportChange = (sportKey, fieldId, val) => {
    setSportData((prev) => ({ ...prev, [sportKey]: { ...(prev[sportKey] || {}), [fieldId]: val } }))
  }

  const scrollToTop = () => scrollViewRef.current?.scrollTo({ y: 0, animated: true })

  const goNext = () => { setStep((s) => s + 1); scrollToTop() }
  const goBack = () => { setStep((s) => s - 1); scrollToTop() }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const sportsPayload = selectedSports.map((key) => {
        const data = sportData[key] || {}
        const { achievements, bestPerf, bestAchievement, playingLevel, yearsExp, ...restStats } = data
        return {
          sport: key,
          skillLevel: playingLevel || null,
          preferredRole: data.playingPos || data.primaryPos || data.playingRole || null,
          stats: Object.keys(restStats).length > 0 ? { ...restStats, yearsExp } : null,
        }
      })

      const payload = {
        fullName: profileData.fullName,
        username: profileData.username,
        phone: profileData.phone,
        password: profileData.password,
        dob: profileData.dob,
        gender: profileData.gender,
        country: profileData.country || 'India',
        state: profileData.state,
        city: profileData.city,
        area: profileData.area || null,
        pincode: profileData.pincode,
        latitude: profileData.latitude || null,
        longitude: profileData.longitude || null,
        profilePhotoUrl: profileData.profilePhotoUrl || null,
        sports: sportsPayload,
      }

      const result = await registerUser(payload)

      if (result.success) {
        dispatch(setUser({ user: result.user, token: result.token }))
        router.replace('/home')
      } else {
        Alert.alert('Registration Failed', result.error || 'Something went wrong. Please try again.')
      }
    } catch {
      Alert.alert('Connection Error', 'Could not connect to the server. Please check your internet connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#C8102E" barStyle="light-content" />

      <View style={styles.stickyHeader}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.logoText}>PLAY<Text style={styles.logoAccent}>CONNECT</Text></Text>
            <Text style={styles.tagline}>Stop Virtual Games. Start Real Battles.</Text>
            <View style={styles.headerIconsRow}>
              {['🏏', '⚽', '🏀', '🏸', '🏐', '🎾', '🏊', '🚴', '🏃', '🏑', '🏓', '🤼'].map((icon, i) => (
                <RNText key={i} style={styles.headerIcon}>{icon}</RNText>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.stepBar}>
          <View style={styles.stepRow}>
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepCircle, step > i && styles.stepCircleDone, step === i && styles.stepCircleActive]}>
                    <Text style={styles.stepCircleText}>{step > i ? "✓" : i + 1}</Text>
                  </View>
                  <Text style={[styles.stepLabel, (step === i || step > i) && styles.stepLabelActive]}>{label}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={[styles.stepLine, step > i && styles.stepLineActive]} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.body}>
          {step === 0 && <StepProfile data={profileData} onChange={handleProfileChange} onNext={goNext} />}
          {step === 1 && <StepSports selectedSports={selectedSports} sportData={sportData} onToggle={toggleSport} onSportChange={handleSportChange} onNext={goNext} onBack={goBack} />}
          {step === 2 && <StepReview profileData={profileData} selectedSports={selectedSports} sportData={sportData} onBack={goBack} onSubmit={handleSubmit} isSubmitting={isSubmitting} />}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  stickyHeader: { zIndex: 100, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#C8102E',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 45,
    paddingBottom: 16,
  },
  headerContent: { alignItems: 'center' },
  logoText: { color: '#fff', fontSize: 24, fontFamily: 'Poppins_800ExtraBold', letterSpacing: -0.5, textAlign: 'center' },
  logoAccent: { opacity: 0.85 },
  tagline: { color: 'rgba(255,255,255,0.75)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4, textAlign: 'center' },
  headerIconsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 10, opacity: 0.5 },
  headerIcon: { fontSize: 16 },
  stepBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', padding: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  stepItem: { alignItems: 'center', width: 72 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  stepCircleActive: { backgroundColor: '#C8102E', borderWidth: 2, borderColor: '#C8102E' },
  stepCircleDone: { backgroundColor: '#C8102E' },
  stepCircleText: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#fff' },
  stepLabel: { fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 5 },
  stepLabelActive: { fontFamily: 'Poppins_600SemiBold', color: '#C8102E' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#f0f0f0', marginHorizontal: 4, marginTop: 14 },
  stepLineActive: { backgroundColor: '#C8102E' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  body: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 22, fontFamily: 'Poppins_800ExtraBold', color: '#111', marginBottom: 4 },
  pageSub: { fontSize: 14, color: '#666', marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontFamily: 'Poppins_700Bold', color: '#C8102E', marginBottom: 14, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#333', marginBottom: 6 },
  required: { color: '#C8102E' },
  input: { borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#fafafa', fontFamily: 'Poppins_400Regular' },
  inputFlex: { flex: 1 },
  inputError: { borderColor: '#C8102E' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center' },
  usernameIcon: { marginLeft: 10 },
  textarea: { borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#fafafa', minHeight: 80, textAlignVertical: 'top', fontFamily: 'Poppins_400Regular' },
  select: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 10, padding: 12, backgroundColor: '#fafafa' },
  selectText: { fontSize: 14, color: '#111', fontFamily: 'Poppins_400Regular' },
  placeholderText: { color: '#999' },
  radioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radioBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e5e5', backgroundColor: '#fafafa' },
  radioBtnSelected: { backgroundColor: '#C8102E', borderColor: '#C8102E' },
  radioText: { fontSize: 13, color: '#555', fontFamily: 'Poppins_400Regular' },
  radioTextSelected: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  errorText: { fontSize: 12, color: '#C8102E', marginTop: 4, fontFamily: 'Poppins_400Regular' },
  successText: { fontSize: 12, color: '#22c55e', marginTop: 4, fontFamily: 'Poppins_400Regular' },
  photoUpload: { borderWidth: 2, borderColor: '#e0e0e0', borderStyle: 'dashed', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 20, minHeight: 90, justifyContent: 'center' },
  photoPreview: { width: 80, height: 80, borderRadius: 40 },
  photoIcon: { fontSize: 28, marginBottom: 6 },
  photoText: { fontSize: 13, color: '#aaa', fontFamily: 'Poppins_400Regular' },
  photoChangeText: { fontSize: 11, color: '#C8102E', marginTop: 6, fontFamily: 'Poppins_600SemiBold' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#f0f0f0' },
  dividerText: { fontSize: 12, color: '#bbb', fontFamily: 'Poppins_500Medium', marginHorizontal: 10 },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#f5f5f5', borderRadius: 12, gap: 8, marginBottom: 16 },
  locationButtonDisabled: { opacity: 0.6 },
  locationButtonText: { fontSize: 14, color: '#C8102E', fontFamily: 'Poppins_600SemiBold' },
  loginLink: { flexDirection: 'row', justifyContent: 'center', marginVertical: 16 },
  loginLinkText: { fontSize: 13, color: '#666', fontFamily: 'Poppins_400Regular' },
  loginAnchor: { color: '#C8102E', fontFamily: 'Poppins_700Bold' },
  nextButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  nextButtonStandalone: { borderRadius: 12, overflow: 'hidden', marginTop: 16 },
  gradient: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  nextButtonText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold', lineHeight: 20 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  backButton: { flex: 1, padding: 14, backgroundColor: '#f5f5f5', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  backButtonText: { color: '#555', fontSize: 15, fontFamily: 'Poppins_600SemiBold', lineHeight: 20 },
  sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  sportCard: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 14, borderWidth: 2, borderColor: '#e8e8e8', backgroundColor: '#fafafa', alignItems: 'center', position: 'relative' },
  sportCardSelected: { borderColor: '#C8102E', backgroundColor: '#FFF0F2' },
  sportEmoji: { fontSize: 28, marginBottom: 6 },
  sportName: { fontSize: 13, color: '#333', fontFamily: 'Poppins_500Medium' },
  sportNameSelected: { fontFamily: 'Poppins_700Bold', color: '#C8102E' },
  sportCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: '#C8102E', justifyContent: 'center', alignItems: 'center' },
  sportCheckText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_700Bold' },
  sportFormCard: { borderWidth: 1.5, borderColor: '#f0f0f0', borderRadius: 16, padding: 16, marginBottom: 16, backgroundColor: '#fff' },
  sportFormHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  sportFormEmoji: { fontSize: 24 },
  sportFormTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#111' },
  sportFormSubtitle: { fontSize: 12, color: '#888', marginTop: 2, fontFamily: 'Poppins_400Regular' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, width: '80%', maxHeight: '60%' },
  modalTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', textAlign: 'center' },
  modalOptions: { maxHeight: 300 },
  modalOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalOptionText: { fontSize: 14, textAlign: 'center', fontFamily: 'Poppins_400Regular' },
  modalCancel: { padding: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  modalCancelText: { fontSize: 14, color: '#C8102E', textAlign: 'center', fontFamily: 'Poppins_600SemiBold' },
  reviewCard: { borderWidth: 1.5, borderColor: '#f0f0f0', borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#fff' },
  reviewHeader: { backgroundColor: '#C8102E', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewPhoto: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#fff' },
  reviewAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { fontSize: 20, color: '#fff', fontFamily: 'Poppins_700Bold' },
  reviewName: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: '#fff' },
  reviewHandle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1, fontFamily: 'Poppins_400Regular' },
  reviewBody: { padding: 14 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  reviewIcon: { fontSize: 16, marginTop: 1 },
  reviewKey: { fontSize: 12, color: '#888', marginBottom: 2, fontFamily: 'Poppins_400Regular' },
  reviewVal: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#111' },
  reviewButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  submitButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold', lineHeight: 20 },
})
