/**
 * Web stub for react-native-google-mobile-ads.
 * This library is native-only (iOS/Android). On web it is replaced
 * with this no-op module so the Metro bundler can resolve it without errors.
 */

const noop = () => {};
const noopAsync = async () => {};

// BannerAd stub component (React component stub)
const BannerAd = () => null;

// Enums / constants stubs
const BannerAdSize = {
  BANNER: 'BANNER',
  LARGE_BANNER: 'LARGE_BANNER',
  MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
  FULL_BANNER: 'FULL_BANNER',
  LEADERBOARD: 'LEADERBOARD',
  ADAPTIVE_BANNER: 'ADAPTIVE_BANNER',
  SMART_BANNER: 'SMART_BANNER',
};

const TestIds = {
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  REWARDED_INTERSTITIAL: 'ca-app-pub-3940256099942544/5354046379',
  APP_OPEN: 'ca-app-pub-3940256099942544/3419835294',
};

const MaxAdContentRating = {
  G: 'G',
  PG: 'PG',
  T: 'T',
  MA: 'MA',
};

// MobileAds initialiser stub
const MobileAds = () => ({
  initialize: noopAsync,
  setRequestConfiguration: noopAsync,
});
MobileAds.initialize = noopAsync;
MobileAds.setRequestConfiguration = noopAsync;

// InterstitialAd stub
const InterstitialAd = {
  createForAdRequest: () => ({
    addAdEventListener: noop,
    removeAllListeners: noop,
    load: noop,
    show: noopAsync,
  }),
};

// RewardedAd stub
const RewardedAd = {
  createForAdRequest: () => ({
    addAdEventListener: noop,
    removeAllListeners: noop,
    load: noop,
    show: noopAsync,
  }),
};

// AdEventType stub
const AdEventType = {
  LOADED: 'loaded',
  ERROR: 'error',
  OPENED: 'opened',
  CLICKED: 'clicked',
  CLOSED: 'closed',
};

// RewardedAdEventType stub
const RewardedAdEventType = {
  LOADED: 'loaded',
  ERROR: 'error',
  OPENED: 'opened',
  CLICKED: 'clicked',
  CLOSED: 'closed',
  EARNED_REWARD: 'earned_reward',
};

module.exports = {
  default: MobileAds,
  MobileAds,
  BannerAd,
  BannerAdSize,
  TestIds,
  MaxAdContentRating,
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
};
