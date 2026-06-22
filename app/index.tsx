import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { StorageService } from '@/services/storage';
import { Colors } from '@/constants/theme';

export default function Entry() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const done = await StorageService.isOnboardingDone();
      if (done) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
