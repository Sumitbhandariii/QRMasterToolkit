import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Clipboard,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { Camera } from 'expo-camera';
import { useQRData } from '@/hooks/useQRData';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAlert } from '@/template';

type ScanStatus = 'idle' | 'picking' | 'processing' | 'success' | 'error';

export default function ScanFromPhoneScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { addItem } = useQRData();

  const [status, setStatus] = useState<ScanStatus>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePickImage = useCallback(async () => {
    setStatus('picking');
    setResult(null);
    setImageUri(null);

    try {
      const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permStatus !== 'granted') {
        showAlert('Permission Required', 'Please grant gallery access to scan QR codes from images.');
        setStatus('idle');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]) {
        setStatus('idle');
        return;
      }

      const pickedUri = pickerResult.assets[0].uri;
      setImageUri(pickedUri);
      setStatus('processing');

      const BARCODE_TYPES: any[] = [
        'qr', 'ean13', 'ean8', 'upc_a', 'upc_e',
        'code39', 'code93', 'code128', 'codabar',
        'datamatrix', 'itf14', 'pdf417', 'aztec',
      ];

      let scanResults: any[] | null = null;

      // Helper: normalize URI to a guaranteed file:// path via expo-image-manipulator
      const normalizeToFileUri = async (uri: string, scale: number = 1): Promise<string> => {
        try {
          const result = await ImageManipulator.manipulateAsync(
            uri,
            scale < 1 ? [{ resize: { width: Math.round(1200 * scale) } }] : [],
            { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
          );
          return result.uri; // always file:// from cache
        } catch {
          return uri;
        }
      };

      // Attempt 1: full-resolution file:// uri
      try {
        const fileUri = await normalizeToFileUri(pickedUri);
        scanResults = await Camera.scanFromURLAsync(fileUri, BARCODE_TYPES);
      } catch {
        scanResults = null;
      }

      // Attempt 2: half-resolution (helps with very large images)
      if (!scanResults || scanResults.length === 0) {
        try {
          const fileUri = await normalizeToFileUri(pickedUri, 0.5);
          scanResults = await Camera.scanFromURLAsync(fileUri, BARCODE_TYPES);
        } catch {
          scanResults = null;
        }
      }

      // Attempt 3: quarter-resolution with QR only
      if (!scanResults || scanResults.length === 0) {
        try {
          const fileUri = await normalizeToFileUri(pickedUri, 0.3);
          scanResults = await Camera.scanFromURLAsync(fileUri, ['qr']);
        } catch {
          scanResults = null;
        }
      }

      // Attempt 4: raw original URI as last resort
      if (!scanResults || scanResults.length === 0) {
        try {
          scanResults = await Camera.scanFromURLAsync(pickedUri, BARCODE_TYPES);
        } catch {
          scanResults = null;
        }
      }

      if (!scanResults || scanResults.length === 0) {
        setStatus('error');
        return;
      }

      const decoded = scanResults[0].data;
      setResult(decoded);
      setStatus('success');

      // Save to history
      await addItem({
        type: 'scanned_from_phone',
        content: decoded,
        title: decoded.length > 40 ? decoded.substring(0, 40) + '...' : decoded,
        subtitle: scanResults[0].type || 'From Gallery',
        qrType: scanResults[0].type || 'gallery',
      });

    } catch (err: any) {
      console.error('Scan from phone error:', err);
      setStatus('error');
    }
  }, [addItem, showAlert]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    Clipboard.setString(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleShare = useCallback(async () => {
    if (!result) return;
    try {
      await Share.share({ message: result });
    } catch {}
  }, [result]);

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setImageUri(null);
    setCopied(false);
  };

  const renderContent = () => {
    switch (status) {
      case 'idle':
        return (
          <View style={styles.idleContainer}>
            <View style={styles.illustrationBox}>
              <MaterialIcons name="collections" size={80} color={Colors.primary} />
            </View>
            <Text style={styles.idleTitle}>Scan from Gallery</Text>
            <Text style={styles.idleSubtitle}>
              Pick any photo from your gallery containing a QR code or barcode.
              We will decode it instantly.
            </Text>
            <TouchableOpacity style={styles.pickBtn} onPress={handlePickImage}>
              <MaterialIcons name="collections" size={22} color={Colors.white} />
              <Text style={styles.pickBtnText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        );

      case 'picking':
      case 'processing':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              {status === 'picking' ? 'Opening gallery...' : 'Scanning for QR codes...'}
            </Text>
          </View>
        );

      case 'success':
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.successContent}>
            {imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                contentFit="contain"
                transition={200}
              />
            )}

            <View style={styles.successBadge}>
              <MaterialIcons name="check-circle" size={22} color={Colors.primary} />
              <Text style={styles.successBadgeText}>QR Code Detected!</Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Decoded Content</Text>
              <Text style={styles.resultText} selectable>{result}</Text>
            </View>

            <View style={styles.resultActions}>
              <TouchableOpacity style={[styles.resultBtn, styles.resultBtnPrimary]} onPress={handleCopy}>
                <MaterialIcons name={copied ? 'check' : 'content-copy'} size={18} color={Colors.white} />
                <Text style={styles.resultBtnTextPrimary}>{copied ? 'Copied!' : 'Copy'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.resultBtn, styles.resultBtnSecondary]} onPress={handleShare}>
                <MaterialIcons name="share" size={18} color={Colors.primary} />
                <Text style={styles.resultBtnTextSecondary}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.scanAnotherBtn} onPress={handleReset}>
              <MaterialIcons name="refresh" size={18} color={Colors.textSecondary} />
              <Text style={styles.scanAnotherText}>Scan Another</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 'error':
        return (
          <View style={styles.errorContainer}>
            {imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImageSmall}
                contentFit="contain"
                transition={200}
              />
            )}
            <View style={styles.errorIconBox}>
              <MaterialIcons name="crop-free" size={40} color={Colors.error} />
            </View>
            <Text style={styles.errorTitle}>No QR Code Found</Text>
            <Text style={styles.errorSubtitle}>
              We could not detect any QR code or barcode in this image.
              Please try a clearer image with better lighting.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handlePickImage}>
              <MaterialIcons name="collections" size={18} color={Colors.white} />
              <Text style={styles.retryBtnText}>Try Another Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLink} onPress={handleReset}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan From Gallery</Text>
        {status === 'success' && (
          <TouchableOpacity style={styles.pickAgainBtn} onPress={handlePickImage}>
            <MaterialIcons name="add" size={18} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.text },
  pickAgainBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  illustrationBox: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  idleTitle: { fontSize: 24, fontWeight: '700', color: Colors.text },
  idleSubtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: Radius.lg,
    marginTop: 8,
    ...Shadow.md,
  },
  pickBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },
  successContent: { padding: 16, gap: 12 },
  previewImage: { width: '100%', height: 200, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
  previewImageSmall: { width: '100%', height: 150, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt, marginHorizontal: 16 },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'center',
  },
  successBadgeText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  resultCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 8, textTransform: 'uppercase' },
  resultText: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  resultActions: { flexDirection: 'row', gap: 12 },
  resultBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: Radius.lg },
  resultBtnPrimary: { backgroundColor: Colors.primary, ...Shadow.sm },
  resultBtnSecondary: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primary },
  resultBtnTextPrimary: { fontSize: 15, fontWeight: '600', color: Colors.white },
  resultBtnTextSecondary: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  scanAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scanAnotherText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  errorSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    marginTop: 8,
    ...Shadow.md,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  cancelLink: { paddingVertical: 8 },
  cancelLinkText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
});
