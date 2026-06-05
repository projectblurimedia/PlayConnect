import React from 'react'
import { View, Text as RNText, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

function Text(props) {
  return <RNText {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]} />
}

export default function FeedScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Feed</Text>
      <Text style={styles.sub}>What's happening in your sports community</Text>

      <View style={styles.emptyBox}>
        <Ionicons name="newspaper-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>Your feed is empty</Text>
        <Text style={styles.emptyHint}>Follow players and join matches to see activity here</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: '#111', marginBottom: 4 },
  sub: { fontSize: 14, color: '#666', marginBottom: 24 },
  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#888', marginTop: 14 },
  emptyHint: { fontSize: 12, color: '#bbb', marginTop: 6, textAlign: 'center', lineHeight: 18 },
})
