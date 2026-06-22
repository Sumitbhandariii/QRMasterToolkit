import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Clipboard,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQRData } from '@/hooks/useQRData';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAlert } from '@/template';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────

interface QRCustomization {
  fgColor: string;
  bgColor: string;
  size: number;
  logoIcon: string | null;
}

const DEFAULT_CUSTOM: QRCustomization = {
  fgColor: '#111827',
  bgColor: '#FFFFFF',
  size: 240,
  logoIcon: null,
};

// ─── Presets ─────────────────────────────────────────────────────────────────

const FG_COLORS = [
  '#111827', '#22C55E', '#3B82F6', '#8B5CF6', '#EF4444',
  '#F59E0B', '#06B6D4', '#EC4899', '#16A34A', '#1D4ED8',
];

const BG_COLORS = [
  '#FFFFFF', '#F0FDF4', '#EFF6FF', '#FFF7ED', '#F5F3FF',
  '#ECFEFF', '#FFF1F2', '#FEFCE8', '#F1F5F9', '#111827',
];

const QR_SIZES = [
  { value: 180, label: 'S', sub: '180' },
  { value: 240, label: 'M', sub: '240' },
  { value: 300, label: 'L', sub: '300' },
  { value: 360, label: 'XL', sub: '360' },
];

const LOGO_ICONS: { icon: string | null; label: string }[] = [
  { icon: null, label: 'None' },
  { icon: 'link', label: 'Link' },
  { icon: 'wifi', label: 'WiFi' },
  { icon: 'phone', label: 'Phone' },
  { icon: 'email', label: 'Email' },
  { icon: 'location-on', label: 'Map' },
  { icon: 'payment', label: 'Pay' },
  { icon: 'message', label: 'SMS' },
  { icon: 'person', label: 'Contact' },
  { icon: 'language', label: 'Web' },
  { icon: 'star', label: 'Star' },
  { icon: 'favorite', label: 'Heart' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

function getOpenAction(content: string): { label: string; icon: string } | null {
  if (!content) return null;
  if (content.startsWith('http://') || content.startsWith('https://'))
    return { label: 'Open in Browser', icon: 'open-in-browser' };
  if (content.startsWith('tel:'))
    return { label: 'Call Number', icon: 'phone' };
  if (content.startsWith('mailto:'))
    return { label: 'Open Email', icon: 'email' };
  if (content.startsWith('sms:') || content.startsWith('smsto:'))
    return { label: 'Send SMS', icon: 'message' };
  if (content.startsWith('geo:'))
    return { label: 'Open Maps', icon: 'map' };
  if (content.startsWith('WIFI:'))
    return { label: 'Connect to WiFi', icon: 'wifi' };
  if (content.startsWith('upi://') || content.startsWith('paytm://') || content.startsWith('phonepe://'))
    return { label: 'Open Payment App', icon: 'payment' };
  return null;
}

function getCustomKey(id: string) {
  return `qr_custom_${id}`;
}

// ─── Color check helper ───────────────────────────────────────────────────────
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GenerateDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const params = useLocalSearchParams();
  const { history, toggleFavorite, deleteItem } = useQRData();
  const viewShotRef = useRef<any>(null);

  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [custom, setCustom] = useState<QRCustomization>(DEFAULT_CUSTOM);
  const [customLoaded, setCustomLoaded] = useState(false);

  const item = history.find(i => i.id === params.id);

  // Load saved customization
  useEffect(() => {
    if (!item) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(getCustomKey(item.id));
        if (raw) setCustom({ ...DEFAULT_CUSTOM, ...JSON.parse(raw) });
      } catch {}
      setCustomLoaded(true);
    })();
  }, [item?.id]);

  // Persist customization whenever it changes (after first load)
  useEffect(() => {
    if (!item || !customLoaded) return;
    AsyncStorage.setItem(getCustomKey(item.id), JSON.stringify(custom)).catch(() => {});
  }, [custom, customLoaded, item?.id]);

  const captureQR = useCallback(async (): Promise<string | null> => {
    try {
      if (!viewShotRef.current) return null;
      return await viewShotRef.current.capture();
    } catch {
      return null;
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please grant media library permission to save QR codes.');
        return;
      }
      const uri = await captureQR();
      if (!uri) { showAlert('Error', 'Failed to capture QR code image.'); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      showAlert('Saved!', 'QR code saved to your gallery.');
    } catch {
      showAlert('Error', 'Failed to save QR code.');
    } finally {
      setSaving(false);
    }
  }, [saving, captureQR, showAlert]);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    try {
      // Always share QR as PNG image
      const uri = await captureQR();
      if (uri) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Share QR Code',
            UTI: 'public.png',
          });
          return;
        }
      }
      // Fallback text share if image unavailable
      await Share.share({ message: item?.content || '', title: item?.title || 'QR Code' });
    } catch {
      try { await Share.share({ message: item?.content || '' }); } catch {}
    } finally {
      setSharing(false);
    }
  }, [sharing, captureQR, item]);

  const handleCopy = useCallback(async () => {
    try {
      Clipboard.setString(item?.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showAlert('Error', 'Failed to copy');
    }
  }, [item, showAlert]);

  const handleOpen = useCallback(async () => {
    if (!item?.content) return;
    try {
      const supported = await Linking.canOpenURL(item.content);
      if (supported) {
        await Linking.openURL(item.content);
      } else {
        showAlert('Cannot Open', 'Your device cannot handle this action.');
      }
    } catch {
      showAlert('Error', 'Failed to open this link.');
    }
  }, [item, showAlert]);

  const handleDelete = () => {
    showAlert('Delete Item', 'Remove this QR code from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if (item) {
            await deleteItem(item.id);
            AsyncStorage.removeItem(getCustomKey(item.id)).catch(() => {});
          }
          router.back();
        },
      },
    ]);
  };

  const openAction = item ? getOpenAction(item.content) : null;
  const ICON_COL_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 16 - 8 * 5) / 6);

  if (!item) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.notFound}>
          <MaterialIcons name="error-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.notFoundText}>QR code not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{item.title}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.headerAction, item.isFavorite && styles.headerActionActive]}
            onPress={() => toggleFavorite(item.id)}
          >
            <MaterialIcons
              name={item.isFavorite ? 'star' : 'star-outline'}
              size={22}
              color={item.isFavorite ? '#F59E0B' : Colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={handleDelete}>
            <MaterialIcons name="delete-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* QR Code Card */}
        <View style={styles.qrCard}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1.0 }}
            style={{ backgroundColor: custom.bgColor, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ backgroundColor: custom.bgColor, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
              <QRCode
                value={item.content || ' '}
                size={custom.size}
                color={custom.fgColor}
                backgroundColor={custom.bgColor}
              />
              {/* Center logo overlay */}
              {custom.logoIcon ? (
                <View
                  style={[
                    styles.centerLogo,
                    {
                      backgroundColor: custom.bgColor,
                      width: Math.round(custom.size * 0.22),
                      height: Math.round(custom.size * 0.22),
                      borderRadius: Math.round(custom.size * 0.04),
                    },
                  ]}
                >
                  <MaterialIcons
                    name={custom.logoIcon as any}
                    size={Math.round(custom.size * 0.13)}
                    color={custom.fgColor}
                  />
                </View>
              ) : null}
            </View>
          </ViewShot>

          {/* Meta */}
          <View style={styles.qrMeta}>
            <View style={styles.qrTypeBadge}>
              <MaterialIcons name="add-circle" size={14} color={Colors.primary} />
              <Text style={styles.qrTypeBadgeText}>{item.subtitle || 'Generated'}</Text>
            </View>
            <Text style={styles.qrTimestamp}>{formatTimestamp(item.timestamp)}</Text>
          </View>

          {/* Customize Toggle */}
          <TouchableOpacity
            style={[styles.customizeToggle, showCustomize && styles.customizeToggleActive]}
            onPress={() => setShowCustomize(v => !v)}
          >
            <MaterialIcons
              name="palette"
              size={18}
              color={showCustomize ? Colors.white : Colors.primary}
            />
            <Text style={[styles.customizeToggleText, showCustomize && { color: Colors.white }]}>
              {showCustomize ? 'Hide Customize' : 'Customize QR'}
            </Text>
            <MaterialIcons
              name={showCustomize ? 'expand-less' : 'expand-more'}
              size={18}
              color={showCustomize ? Colors.white : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Customization Panel */}
        {showCustomize && (
          <View style={styles.customPanel}>

            {/* Foreground Color */}
            <Text style={styles.customLabel}>QR Color</Text>
            <View style={styles.colorRow}>
              {FG_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    custom.fgColor === c && styles.colorSwatchSelected,
                    c === '#FFFFFF' && { borderWidth: 1, borderColor: Colors.border },
                  ]}
                  onPress={() => setCustom(p => ({ ...p, fgColor: c }))}
                >
                  {custom.fgColor === c ? (
                    <MaterialIcons name="check" size={14} color={isLightColor(c) ? '#111827' : '#FFFFFF'} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>

            {/* Background Color */}
            <Text style={styles.customLabel}>Background Color</Text>
            <View style={styles.colorRow}>
              {BG_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    custom.bgColor === c && styles.colorSwatchSelected,
                    c === '#FFFFFF' && { borderWidth: 1, borderColor: Colors.border },
                  ]}
                  onPress={() => setCustom(p => ({ ...p, bgColor: c }))}
                >
                  {custom.bgColor === c ? (
                    <MaterialIcons name="check" size={14} color={isLightColor(c) ? '#111827' : '#FFFFFF'} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>

            {/* Size */}
            <Text style={styles.customLabel}>QR Size</Text>
            <View style={styles.sizeRow}>
              {QR_SIZES.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.sizeBtn, custom.size === s.value && styles.sizeBtnActive]}
                  onPress={() => setCustom(p => ({ ...p, size: s.value }))}
                >
                  <Text style={[styles.sizeBtnLabel, custom.size === s.value && styles.sizeBtnLabelActive]}>
                    {s.label}
                  </Text>
                  <Text style={[styles.sizeBtnSub, custom.size === s.value && { color: 'rgba(255,255,255,0.8)' }]}>
                    {s.sub}px
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Center Icon */}
            <Text style={styles.customLabel}>Center Icon</Text>
            <View style={styles.iconGrid}>
              {LOGO_ICONS.map(l => (
                <TouchableOpacity
                  key={l.icon ?? 'none'}
                  style={[
                    styles.iconOption,
                    { width: ICON_COL_WIDTH },
                    custom.logoIcon === l.icon && styles.iconOptionActive,
                  ]}
                  onPress={() => setCustom(p => ({ ...p, logoIcon: l.icon }))}
                >
                  {l.icon ? (
                    <MaterialIcons
                      name={l.icon as any}
                      size={20}
                      color={custom.logoIcon === l.icon ? Colors.white : Colors.text}
                    />
                  ) : (
                    <MaterialIcons
                      name="block"
                      size={20}
                      color={custom.logoIcon === l.icon ? Colors.white : Colors.textMuted}
                    />
                  )}
                  <Text style={[styles.iconOptionLabel, custom.logoIcon === l.icon && { color: Colors.white }]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reset */}
            <TouchableOpacity style={styles.resetBtn} onPress={() => setCustom(DEFAULT_CUSTOM)}>
              <MaterialIcons name="refresh" size={16} color={Colors.textSecondary} />
              <Text style={styles.resetText}>Reset to Default</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <View style={styles.contentCard}>
          <Text style={styles.contentLabel}>QR Content</Text>
          <Text style={styles.contentText} selectable>{item.content}</Text>
        </View>

        {/* Open Action */}
        {openAction ? (
          <TouchableOpacity style={styles.openBtn} onPress={handleOpen}>
            <MaterialIcons name={openAction.icon as any} size={20} color={Colors.white} />
            <Text style={styles.openBtnText}>{openAction.label}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size={18} color={Colors.white} />
            ) : (
              <MaterialIcons name="download" size={20} color={Colors.white} />
            )}
            <Text style={styles.actionBtnTextPrimary}>{saving ? 'Saving...' : 'Save PNG'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator size={18} color={Colors.primary} />
            ) : (
              <MaterialIcons name="share" size={20} color={Colors.primary} />
            )}
            <Text style={styles.actionBtnTextSecondary}>{sharing ? 'Sharing...' : 'Share QR Image'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={handleCopy}>
            <MaterialIcons name={copied ? 'check' : 'content-copy'} size={20} color={Colors.text} />
            <Text style={styles.actionBtnTextOutline}>{copied ? 'Copied!' : 'Copy Content'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  backIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.text },
  headerAction: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center',
  },
  headerActionActive: { backgroundColor: '#FFFBEB' },
  scrollContent: { paddingHorizontal: 16 },

  // QR Card
  qrCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 20,
    alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.md,
  },
  centerLogo: {
    position: 'absolute', justifyContent: 'center', alignItems: 'center',
  },
  qrMeta: { alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 14 },
  qrTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  qrTypeBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  qrTimestamp: { fontSize: 12, color: Colors.textMuted },
  customizeToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.white,
  },
  customizeToggleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  customizeToggleText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // Customize Panel
  customPanel: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  customLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 6,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3, borderColor: Colors.text,
    transform: [{ scale: 1.12 }],
  },
  sizeRow: { flexDirection: 'row', gap: 8 },
  sizeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  sizeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sizeBtnLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sizeBtnLabelActive: { color: Colors.white },
  sizeBtnSub: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconOption: {
    paddingVertical: 8, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', gap: 3,
  },
  iconOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  iconOptionLabel: { fontSize: 9, fontWeight: '600', color: Colors.textSecondary },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt, marginTop: 6,
  },
  resetText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },

  // Content
  contentCard: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  contentLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  contentText: { fontSize: 14, color: Colors.text, lineHeight: 20 },

  // Open button
  openBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: Radius.lg, backgroundColor: '#3B82F6',
    marginBottom: 10, ...Shadow.sm,
  },
  openBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  // Actions
  actionsGrid: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: Radius.lg,
  },
  actionBtnPrimary: { backgroundColor: Colors.primary, ...Shadow.sm },
  actionBtnSecondary: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primary },
  actionBtnOutline: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  actionBtnTextPrimary: { fontSize: 15, fontWeight: '700', color: Colors.white },
  actionBtnTextSecondary: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  actionBtnTextOutline: { fontSize: 15, fontWeight: '600', color: Colors.text },

  // Not found
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFoundText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary },
  backBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: Radius.lg,
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: Colors.white },
});
