import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Vibration,
  Platform,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  runOnJS,
  interpolate,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQRData } from '@/hooks/useQRData';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { AdManager } from '@/services/adManager';

const { width } = Dimensions.get('window');
const SCAN_AREA = width * 0.7;
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 3;

// ─── Animated scan-line ────────────────────────────────────────────────────────
function ScanLine() {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(SCAN_AREA - 4, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(translateY);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.scanLine, style]} pointerEvents="none">
      <View style={styles.scanLineInner} />
    </Animated.View>
  );
}

// ─── Animated corner markers ───────────────────────────────────────────────────
function CornerMarkers({ success }: { success: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (success) {
      scale.value = withSequence(
        withSpring(1.15, { damping: 4, stiffness: 220 }),
        withSpring(1, { damping: 8, stiffness: 180 })
      );
      opacity.value = withSequence(
        withTiming(0.4, { duration: 80 }),
        withTiming(1, { duration: 200 })
      );
    }
  }, [success]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const borderColor = success ? '#FFFFFF' : Colors.primary;
  const c = (extra: object) => [
    styles.corner,
    extra,
    { borderColor },
  ];

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]} pointerEvents="none">
      <View style={c(styles.cornerTL)} />
      <View style={c(styles.cornerTR)} />
      <View style={c(styles.cornerBL)} />
      <View style={c(styles.cornerBR)} />
    </Animated.View>
  );
}

// ─── Success ripple flash ──────────────────────────────────────────────────────
function SuccessFlash({ visible }: { visible: boolean }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withSequence(
        withTiming(0.45, { duration: 80 }),
        withTiming(0, { duration: 350 })
      );
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.successFlash, style]}
      pointerEvents="none"
    />
  );
}

// ─── Scanned badge ─────────────────────────────────────────────────────────────
function ScannedBadge({ visible }: { visible: boolean }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 120 });
      scale.value = withSpring(1, { damping: 10, stiffness: 260 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.scannedBadge, style]} pointerEvents="none">
      <MaterialIcons name="check-circle" size={34} color={Colors.white} />
      <Text style={styles.scannedText}>Detected!</Text>
    </Animated.View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addItem } = useQRData();
  const [permission, requestPermission] = useCameraPermissions();

  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);

  const lastScanRef = useRef('');
  const cooldownRef = useRef(false);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-check permission when app comes back to foreground (user may have
  // granted it in Settings while we showed the "denied" screen).
  useEffect(() => {
    const handler = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        requestPermission();
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [requestPermission]);

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      setScanned(false);
      lastScanRef.current = '';
      cooldownRef.current = false;
      return () => {
        setIsActive(false);
        setTorch(false);
        if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      };
    }, [])
  );

  // ── Barcode / QR detected ────────────────────────────────────────────────────
  const handleBarCodeScanned = useCallback(
    async ({ type, data }: { type: string; data: string }) => {
      if (cooldownRef.current || scanned) return;
      if (data === lastScanRef.current) return;

      cooldownRef.current = true;
      lastScanRef.current = data;
      setScanned(true);
      setSuccessFlash(true);

      if (Platform.OS !== 'web') {
        try {
          Vibration.vibrate([0, 60, 40, 60]);
        } catch {}
      }

      try {
        const item = await addItem({
          type: 'scanned',
          content: data,
          title: data.length > 40 ? data.substring(0, 40) + '…' : data,
          subtitle: type || 'QR Code',
          qrType: type,
        });

        const shouldShowAd = AdManager.onScanCompleted();
        if (shouldShowAd) {
          await AdManager.showInterstitial(() => {
            router.push({ pathname: '/scan-detail', params: { id: item.id } });
          });
        } else {
          router.push({ pathname: '/scan-detail', params: { id: item.id } });
        }
      } catch {
        setScanned(false);
        cooldownRef.current = false;
      }
    },
    [scanned, addItem, router]
  );

  const handleRescan = () => {
    setScanned(false);
    setSuccessFlash(false);
    lastScanRef.current = '';
    cooldownRef.current = false;
  };

  // ── Camera flip with stability gate ─────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (isSwitching) return;
    setIsSwitching(true);
    setTorch(false);
    // Unmount camera for one frame to prevent white-screen flash
    setIsActive(false);
    switchTimerRef.current = setTimeout(() => {
      setFacing(prev => (prev === 'back' ? 'front' : 'back'));
      // Small extra delay for the new facing to settle
      switchTimerRef.current = setTimeout(() => {
        setIsActive(true);
        setIsSwitching(false);
      }, 120);
    }, 80);
  }, [isSwitching]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Permission: loading
  // ─────────────────────────────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={[styles.centeredScreen, { paddingTop: insets.top }]}>
        <View style={styles.permCard}>
          <View style={styles.permIconWrap}>
            <MaterialIcons name="camera-alt" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.permTitle}>Loading Camera…</Text>
          <Text style={styles.permSubtitle}>Checking camera permissions</Text>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Permission: not granted
  // ─────────────────────────────────────────────────────────────────────────────
  if (!permission.granted) {
    const isDenied = !permission.canAskAgain;

    const handlePermissionAction = async () => {
      if (isDenied) {
        // User permanently denied — send them to OS settings
        await Linking.openSettings();
      } else {
        await requestPermission();
      }
    };

    return (
      <View style={[styles.centeredScreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.permCard}>
          {/* Icon */}
          <View style={styles.permIconWrap}>
            <MaterialIcons name="no-photography" size={40} color={Colors.error} />
          </View>

          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSubtitle}>
            {isDenied
              ? 'Camera permission was denied. Please enable it in your device Settings to use the scanner.'
              : 'QR Master needs your camera to scan QR codes and barcodes.'}
          </Text>

          {/* Primary action */}
          <TouchableOpacity
            style={styles.permBtn}
            onPress={handlePermissionAction}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name={isDenied ? 'settings' : 'camera-alt'}
              size={18}
              color={Colors.white}
            />
            <Text style={styles.permBtnText}>
              {isDenied ? 'Open Settings' : 'Grant Permission'}
            </Text>
          </TouchableOpacity>

          {isDenied && (
            <Text style={styles.permHint}>
              Settings → Apps → QR Master Toolkit → Permissions → Camera
            </Text>
          )}

          {/* Fallback: scan from gallery */}
          <TouchableOpacity
            style={styles.permSecondaryBtn}
            onPress={() => router.push('/scan-from-phone')}
            activeOpacity={0.8}
          >
            <MaterialIcons name="collections" size={16} color={Colors.primary} />
            <Text style={styles.permSecondaryText}>Scan From Gallery Instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Camera active
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan QR / Barcode</Text>
        <TouchableOpacity
          style={styles.galleryBtn}
          onPress={() => router.push('/scan-from-phone')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="collections" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Camera viewport */}
      <View style={styles.cameraContainer}>
        {/* Camera feed — only mounted when active & not switching */}
        {isActive && !isSwitching ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing={facing}
            enableTorch={torch}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr', 'ean13', 'ean8', 'upc_a', 'upc_e',
                'code39', 'code93', 'code128', 'codabar',
                'datamatrix', 'itf14', 'pdf417', 'aztec',
              ],
            }}
          />
        ) : (
          /* Black placeholder during switch — prevents white flash */
          <View style={[StyleSheet.absoluteFill, styles.switchingPlaceholder]}>
            {isSwitching && (
              <MaterialIcons name="flip-camera-android" size={36} color="rgba(255,255,255,0.4)" />
            )}
          </View>
        )}

        {/* Success flash overlay */}
        <SuccessFlash visible={successFlash} />

        {/* Dimmed overlay with scan window */}
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />

            <View style={styles.scanWindow}>
              {/* Animated scan line (only when idle) */}
              {!scanned && <ScanLine />}

              {/* Animated corners */}
              <CornerMarkers success={scanned} />

              {/* Success badge */}
              <ScannedBadge visible={scanned} />
            </View>

            <View style={styles.sideOverlay} />
          </View>

          <View style={styles.bottomOverlay}>
            <Text style={styles.hintText}>
              {isSwitching
                ? 'Switching camera…'
                : scanned
                ? 'Code detected! Opening result…'
                : 'Point camera at QR code or barcode'}
            </Text>
          </View>
        </View>

        {/* Controls row */}
        <View style={[styles.controls, { bottom: insets.bottom + 24 }]}>
          {/* Flashlight — disabled for front camera */}
          <TouchableOpacity
            style={[
              styles.controlBtn,
              torch && styles.controlBtnActive,
              facing === 'front' && styles.controlBtnDisabled,
            ]}
            onPress={() => facing === 'back' && setTorch(p => !p)}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={torch ? 'highlight' : 'flashlight-off'}
              size={24}
              color={
                facing === 'front'
                  ? 'rgba(255,255,255,0.3)'
                  : torch
                  ? Colors.primary
                  : Colors.white
              }
            />
          </TouchableOpacity>

          {/* Rescan / centre hint */}
          {scanned ? (
            <TouchableOpacity
              style={styles.rescanBtn}
              onPress={handleRescan}
              activeOpacity={0.85}
            >
              <MaterialIcons name="refresh" size={20} color={Colors.white} />
              <Text style={styles.rescanText}>Scan Again</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.modeBadge}>
              <MaterialIcons
                name={facing === 'back' ? 'qr-code-scanner' : 'person'}
                size={16}
                color="rgba(255,255,255,0.85)"
              />
              <Text style={styles.modeBadgeText}>
                {facing === 'back' ? 'Back Camera' : 'Front Camera'}
              </Text>
            </View>
          )}

          {/* Flip camera */}
          <TouchableOpacity
            style={[styles.controlBtn, isSwitching && styles.controlBtnDisabled]}
            onPress={toggleCamera}
            activeOpacity={0.8}
          >
            <MaterialIcons name="flip-camera-android" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const OVERLAY_COLOR = 'rgba(0,0,0,0.62)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Permission screens
  centeredScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 360,
    ...Shadow.lg,
  },
  permIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  permSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    marginTop: 8,
    ...Shadow.md,
  },
  permBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  permHint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  permSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: 4,
  },
  permSecondaryText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.background,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  galleryBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Camera
  cameraContainer: { flex: 1, position: 'relative', backgroundColor: '#000' },
  switchingPlaceholder: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Success flash
  successFlash: {
    backgroundColor: Colors.primary,
    zIndex: 10,
  },

  // Dimmed overlay
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  topOverlay: { flex: 1, backgroundColor: OVERLAY_COLOR },
  middleRow: { flexDirection: 'row', height: SCAN_AREA },
  sideOverlay: { flex: 1, backgroundColor: OVERLAY_COLOR },
  scanWindow: {
    width: SCAN_AREA,
    height: SCAN_AREA,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
    alignItems: 'center',
    paddingTop: 22,
    paddingHorizontal: 32,
  },
  hintText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },

  // Scan line
  scanLine: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 2,
  },
  scanLineInner: {
    height: 2,
    marginHorizontal: 4,
    borderRadius: 1,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },

  // Corner markers
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 3,
  },

  // Scanned badge
  scannedBadge: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 4,
    ...Shadow.lg,
  },
  scannedText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  // Bottom controls
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 10,
  },
  controlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderColor: Colors.primary,
  },
  controlBtnDisabled: {
    opacity: 0.4,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: Radius.full,
    ...Shadow.md,
  },
  rescanText: { fontSize: 14, fontWeight: '600', color: Colors.white },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modeBadgeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
});
