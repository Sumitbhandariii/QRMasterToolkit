import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Vibration,
  Platform,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType, FlashMode } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQRData } from '@/hooks/useQRData';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { AdManager } from '@/services/adManager';
import { useFocusEffect } from 'expo-router';

const { width, height } = Dimensions.get('window');
const SCAN_AREA = width * 0.7;

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addItem } = useQRData();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState<boolean>(false);
  const [scanned, setScanned] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const lastScanRef = useRef<string>('');
  const cooldownRef = useRef<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      setScanned(false);
      lastScanRef.current = '';
      cooldownRef.current = false;
      return () => {
        setIsActive(false);
        setTorch(false);
      };
    }, [])
  );

  const handleBarCodeScanned = useCallback(async ({ type, data }: { type: string; data: string }) => {
    if (cooldownRef.current || scanned) return;
    if (data === lastScanRef.current) return;

    cooldownRef.current = true;
    lastScanRef.current = data;
    setScanned(true);

    if (Platform.OS !== 'web') {
      try { Vibration.vibrate(100); } catch {}
    }

    try {
      const item = await addItem({
        type: 'scanned',
        content: data,
        title: data.length > 40 ? data.substring(0, 40) + '...' : data,
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
  }, [scanned, addItem, router]);

  const handleRescan = () => {
    setScanned(false);
    lastScanRef.current = '';
    cooldownRef.current = false;
  };

  const toggleCamera = () => {
    setTorch(false);
    setFacing(prev => (prev === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <MaterialIcons name="camera-alt" size={64} color={Colors.primary} />
        <Text style={styles.permText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <View style={styles.permCard}>
          <MaterialIcons name="camera-alt" size={64} color={Colors.primary} />
          <Text style={styles.permTitle}>Camera Permission Required</Text>
          <Text style={styles.permSubtitle}>
            We need camera access to scan QR codes and barcodes.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan QR / Barcode</Text>
        <TouchableOpacity
          style={styles.galleryBtn}
          onPress={() => router.push('/scan-from-phone')}
        >
          <MaterialIcons name="collections" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        {isActive && (
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
        )}

        {/* Overlay */}
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            <View style={styles.scanWindow}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              {scanned && (
                <View style={styles.scannedBadge}>
                  <MaterialIcons name="check-circle" size={32} color={Colors.white} />
                  <Text style={styles.scannedText}>Scanned!</Text>
                </View>
              )}
            </View>
            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay}>
            <Text style={styles.hintText}>
              {scanned ? 'Code detected! Opening result...' : 'Point camera at QR code or barcode'}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={[styles.controls, { bottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            style={[styles.controlBtn, torch && styles.controlBtnActive]}
            onPress={() => setTorch(prev => !prev)}
          >
            <MaterialIcons
              name={torch ? 'highlight' : 'highlight-off'}
              size={24}
              color={torch ? Colors.primary : Colors.white}
            />
          </TouchableOpacity>

          {scanned && (
            <TouchableOpacity style={styles.rescanBtn} onPress={handleRescan}>
              <MaterialIcons name="refresh" size={20} color={Colors.white} />
              <Text style={styles.rescanText}>Scan Again</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.controlBtn} onPress={toggleCamera}>
            <MaterialIcons name="flip-camera-android" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.6)';
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    ...Shadow.lg,
  },
  permTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  permSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  permText: { fontSize: 16, color: Colors.textSecondary, marginTop: 16 },
  permBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    marginTop: 8,
  },
  permBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
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
  cameraContainer: { flex: 1, position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject },
  topOverlay: { flex: 1, backgroundColor: OVERLAY_COLOR },
  middleRow: { flexDirection: 'row', height: SCAN_AREA },
  sideOverlay: { flex: 1, backgroundColor: OVERLAY_COLOR },
  scanWindow: {
    width: SCAN_AREA,
    height: SCAN_AREA,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
    alignItems: 'center',
    paddingTop: 24,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  scannedBadge: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 4,
  },
  scannedText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  hintText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontWeight: '500' },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderColor: Colors.primary,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.full,
    ...Shadow.md,
  },
  rescanText: { fontSize: 14, fontWeight: '600', color: Colors.white },
});
