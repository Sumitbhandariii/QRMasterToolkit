import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { QRDataProvider } from '@/contexts/QRDataContext';
import { useEffect } from 'react';
import { AdManager } from '@/services/adManager';

export default function RootLayout() {
  useEffect(() => {
    AdManager.initialize();
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
