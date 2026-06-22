/**
 * AdBanner — placeholder for Expo Go / OnSpace preview.
 *
 * react-native-google-mobile-ads requires a native EAS build.
 * This component renders a styled placeholder in preview and will
 * be replaced by a real BannerAd in the production EAS build.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

interface Props {
  placement: 'home' | 'history';
}

export function AdBanner({ placement }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Advertisement</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 8,
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
