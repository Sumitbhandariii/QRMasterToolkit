/**
 * AdManager — safe stub for Expo Go / OnSpace preview.
 *
 * react-native-google-mobile-ads requires a native EAS build.
 * All real Ad Unit IDs are stored in constants/config.ts and wired
 * into app.json's plugin so they activate automatically on production builds.
 *
 * In preview mode this module is a no-op that never crashes the app.
 */

import { AD_CONFIG } from '@/constants/config';

let scanCountSinceLastAd = 0;
let generateCountSinceLastAd = 0;

export const AdManager = {
  async initialize() {
    // No-op in preview — native module not available until EAS build
  },

  getBannerAdUnitId(placement: 'home' | 'history'): string {
    return placement === 'home' ? AD_CONFIG.BANNER_HOME : AD_CONFIG.BANNER_HISTORY;
  },

  getInterstitialAdUnitId(): string {
    return AD_CONFIG.INTERSTITIAL;
  },

  getRewardedAdUnitId(): string {
    return AD_CONFIG.REWARDED;
  },

  onScanCompleted(): boolean {
    scanCountSinceLastAd++;
    if (scanCountSinceLastAd >= AD_CONFIG.INTERSTITIAL_SCAN_THRESHOLD) {
      scanCountSinceLastAd = 0;
      return true;
    }
    return false;
  },

  onGenerateCompleted(): boolean {
    generateCountSinceLastAd++;
    if (generateCountSinceLastAd >= AD_CONFIG.INTERSTITIAL_GENERATE_THRESHOLD) {
      generateCountSinceLastAd = 0;
      return true;
    }
    return false;
  },

  async showInterstitial(onDismiss?: () => void): Promise<boolean> {
    // Will be active after EAS production build
    onDismiss?.();
    return false;
  },

  async showRewarded(onReward?: () => void, onDismiss?: () => void): Promise<boolean> {
    // Will be active after EAS production build
    onReward?.();
    onDismiss?.();
    return false;
  },
};
