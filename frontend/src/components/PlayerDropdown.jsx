import React, { useState } from 'react'
import { View, Text as RNText, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const ACCENT = '#C8102E'

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// A single-select dropdown that shows the chosen player's info and collapses
// automatically on selection. Used to build "column-wise" lineup pickers
// (Striker → Non-Striker → Bowler) in create-match and innings-break flows.
export default function PlayerDropdown({
  label, icon, players = [], value, onChange,
  excludeIds = [], disabled, isDark, accentColor = ACCENT,
}) {
  const [open, setOpen] = useState(false)
  const cardBg = isDark ? '#1e1e1e' : '#fff'
  const textColor = isDark ? '#fff' : '#111'
  const mutedColor = isDark ? '#888' : '#999'
  const listBg = isDark ? '#181818' : '#f6f6f6'

  const selected = players.find(p => p.userId === value)
  const options = players.filter(p => !excludeIds.includes(p.userId))

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[
          styles.header,
          { backgroundColor: cardBg },
          selected && { borderColor: accentColor + '50', borderWidth: 1.5 },
          disabled && { opacity: 0.45 },
        ]}
        activeOpacity={0.8}
        disabled={disabled}
        onPress={() => setOpen(o => !o)}
      >
        <View style={[styles.iconWrap, { backgroundColor: accentColor + '15' }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: mutedColor }]}>{label}</Text>
          {selected
            ? <Text style={[styles.value, { color: textColor }]} numberOfLines={1}>{selected.user?.fullName}</Text>
            : <Text style={[styles.placeholder, { color: mutedColor }]} numberOfLines={1}>
                {disabled ? 'Select above first' : 'Tap to choose'}
              </Text>
          }
        </View>
        {selected
          ? <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
          : <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={mutedColor} />
        }
      </TouchableOpacity>

      {open && !disabled && (
        <View style={[styles.list, { backgroundColor: listBg }]}>
          {options.length === 0
            ? <Text style={[styles.empty, { color: mutedColor }]}>No players available</Text>
            : options.map(m => {
              const sel = m.userId === value
              return (
                <TouchableOpacity
                  key={m.userId}
                  style={[styles.item, sel && { backgroundColor: accentColor }]}
                  onPress={() => { onChange(m.userId); setOpen(false) }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.itemAvatar, { backgroundColor: sel ? '#fff' : accentColor + '20' }]}>
                    <Text style={[styles.itemAvatarText, { color: accentColor }]}>{initials(m.user?.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: sel ? '#fff' : textColor }]} numberOfLines={1}>{m.user?.fullName}</Text>
                    {!!m.role && <Text style={[styles.itemRole, { color: sel ? 'rgba(255,255,255,0.75)' : mutedColor }]}>{m.role}</Text>}
                  </View>
                  {sel && <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                </TouchableOpacity>
              )
            })
          }
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12, elevation: 2 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 18 },
  label: { fontSize: 10.5, fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  value: { fontSize: 14.5, fontFamily: 'Poppins_700Bold' },
  placeholder: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  list: { borderRadius: 14, marginTop: 6, padding: 6, gap: 4 },
  empty: { fontSize: 12, textAlign: 'center', paddingVertical: 14, fontFamily: 'Poppins_500Medium' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 10 },
  itemAvatar: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  itemAvatarText: { fontSize: 12, fontFamily: 'Poppins_700Bold' },
  itemName: { fontSize: 13.5, fontFamily: 'Poppins_600SemiBold' },
  itemRole: { fontSize: 10.5, marginTop: 1 },
})
