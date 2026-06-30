import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { QRDataProvider } from '@/contexts/QRDataContext';
import { useEffect } from 'react';
import { AdManager } from '@/services/adManager';
import { SoundManager } from '@/services/soundManager';

export default function RootLayout() {
  useEffect(() => {
    AdManager.initialize();
    SoundManager.init(); // pre-generate WAV tones so first scan plays instantly
  }, []);

  return (
    <AlertProvider>
      <SafeAreaProvider>
        <QRDataProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="scan-detail" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="generate-detail" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="scan-from-phone" options={{ headerShown: false }} />
          </Stack>
        </QRDataProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
