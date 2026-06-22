export const AD_CONFIG = {
  // AdMob App ID (configured in app.json plugin)
  APP_ID_ANDROID: 'ca-app-pub-8212461864193378~4599440732',

  // Real Ad Unit IDs
  BANNER_HOME: 'ca-app-pub-8212461864193378/9043338380',
  BANNER_HISTORY: 'ca-app-pub-8212461864193378/9043338380',
  INTERSTITIAL: 'ca-app-pub-8212461864193378/2474361922',
  REWARDED: 'ca-app-pub-8212461864193378/4620757500',

  // Show interstitial after this many scans/generates
  INTERSTITIAL_SCAN_THRESHOLD: 5,
  INTERSTITIAL_GENERATE_THRESHOLD: 3,

  USE_TEST_ADS: false,
};

export const APP_CONFIG = {
  ONBOARDING_KEY: 'qr_master_onboarding_done',
  HISTORY_KEY: 'qr_master_history',
  FAVORITES_KEY: 'qr_master_favorites',
  SCAN_COUNT_KEY: 'qr_master_scan_count',
  GENERATE_COUNT_KEY: 'qr_master_generate_count',
  MAX_HISTORY: 500,
};

export const QR_TYPES = [
  { id: 'text', label: 'Text', icon: 'text-fields', color: '#22C55E' },
  { id: 'url', label: 'URL', icon: 'link', color: '#3B82F6' },
  { id: 'wifi', label: 'WiFi', icon: 'wifi', color: '#8B5CF6' },
  { id: 'phone', label: 'Phone', icon: 'phone', color: '#F59E0B' },
  { id: 'sms', label: 'SMS', icon: 'message', color: '#EC4899' },
  { id: 'email', label: 'Email', icon: 'email', color: '#EF4444' },
  { id: 'contact', label: 'Contact', icon: 'person', color: '#06B6D4' },
  { id: 'location', label: 'Location', icon: 'location-on', color: '#F97316' },
  { id: 'upi', label: 'UPI', icon: 'payment', color: '#16A34A' },
] as const;

export type QRTypeId = 'text' | 'url' | 'wifi' | 'phone' | 'sms' | 'email' | 'contact' | 'location' | 'upi';
