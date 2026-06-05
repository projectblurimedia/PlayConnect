import { useColorScheme, View, ActivityIndicator } from 'react-native'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import { Stack } from 'expo-router'
import { Provider, useSelector } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import { store, persistor } from '../store'

SplashScreen.preventAutoHideAsync()

function ThemeContainer({ children }) {
  const reduxTheme = useSelector(state => state.user.theme)
  const systemScheme = useColorScheme()
  const scheme = reduxTheme || (systemScheme === 'dark' ? 'dark' : 'light')
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      {children}
    </ThemeProvider>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <Provider store={store}>
      <PersistGate
        loading={<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#C8102E" /></View>}
        persistor={persistor}
      >
        <ThemeContainer>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false, animation: 'fade', statusBarTranslucent: true }} />
        </ThemeContainer>
      </PersistGate>
    </Provider>
  )
}
