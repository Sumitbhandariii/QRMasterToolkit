import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Clipboard,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQRData } from '@/hooks/useQRData';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAlert } from '@/template';

function getTypeIcon(type: string): { icon: any; color: string; label: string } {
  const t = type?.toLowerCase() || '';
  if (t.includes('qr') || t === 'qr') return { icon: 'crop-free', color: Colors.primary, label: 'QR Code' };
  if (t.includes('url') || t.includes('http')) return { icon: 'link', color: '#3B82F6', label: 'URL' };
  if (t.includes('ean') || t.includes('upc') || t.includes('code')) return { icon: 'menu', color: '#F59E0B', label: 'Barcode' };
  if (t.includes('wifi')) return { icon: 'wifi', color: '#8B5CF6', label: 'WiFi' };
  if (t.includes('tel') || t.includes('phone')) return { icon: 'phone', color: '#06B6D4', label: 'Phone' };
  if (t.includes('sms')) return { icon: 'message', color: '#EC4899', label: 'SMS' };
  if (t.includes('mailto') || t.includes('email')) return { icon: 'email', color: '#EF4444', label: 'Email' };
  if (t.includes('geo') || t.includes('location')) return { icon: 'location-on', color: '#F97316', label: 'Location' };
  return { icon: 'document-scanner', color: Colors.primary, label: 'Scanned Code' };
}

function getActionForContent(content: string) {
  if (!content) return null;
  if (content.startsWith('http://') || content.startsWith('https://')) return { type: 'url', label: 'Open URL', icon: 'open-in-new' };
  if (content.startsWith('tel:')) return { type: 'phone', label: 'Call Number', icon: 'phone' };
  if (content.startsWith('mailto:')) return { type: 'email', label: 'Send Email', icon: 'email' };
  if (content.startsWith('sms:') || content.startsWith('smsto:')) return { type: 'sms', label: 'Send SMS', icon: 'message' };
  if (content.startsWith('geo:')) return { type: 'map', label: 'Open Map', icon: 'map' };
  if (content.startsWith('WIFI:')) return { type: 'wifi', label: 'Connect to WiFi', icon: 'wifi' };
  return null;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function ScanDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const params = useLocalSearchParams();
  const { history, toggleFavorite, deleteItem } = useQRData();
  const [copied, setCopied] = useState(false);

  const item = history.find(i => i.id === params.id);

  if (!item) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.notFound}>
          <MaterialIcons name="error-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.notFoundText}>Item not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const typeInfo = getTypeIcon(item.qrType || item.subtitle || '');
  const action = getActionForContent(item.content);

  const handleCopy = async () => {
    try {
      Clipboard.setString(item.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showAlert('Error', 'Failed to copy');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: item.content, title: item.title });
    } catch {}
  };

  const handleOpen = async () => {
    if (!action) return;
    try {
      const url = item.content.startsWith('smsto:')
        ? 'sms:' + item.content.replace('smsto:', '').split(':')[0]
        : item.content;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showAlert('Cannot Open', 'Your device cannot handle this action.');
      }
    } catch {
      showAlert('Error', 'Failed to open this link.');
    }
  };

  const handleAction = handleOpen;

  const handleDelete = () => {
    showAlert('Delete Item', 'Remove this item from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteItem(item.id);
          router.back();
        }
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Result</Text>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Type Badge */}
        <View style={[styles.typeBadgeContainer, { backgroundColor: typeInfo.color + '15' }]}>
          <View style={[styles.typeIconBox, { backgroundColor: typeInfo.color + '20' }]}>
            <MaterialIcons name={typeInfo.icon} size={36} color={typeInfo.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.typeLabel, { color: typeInfo.color }]}>{typeInfo.label}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
          </View>
          {item.type === 'scanned_from_phone' && (
            <View style={styles.phoneBadge}>
              <MaterialIcons name="collections" size={14} color={Colors.white} />
              <Text style={styles.phoneBadgeText}>Gallery</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentCard}>
          <Text style={styles.contentLabel}>Content</Text>
          <Text style={styles.contentText} selectable>{item.content}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={handleCopy}
          >
            <MaterialIcons name={copied ? 'check' : 'content-copy'} size={18} color={Colors.white} />
            <Text style={styles.actionBtnTextPrimary}>{copied ? 'Copied!' : 'Copy'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={handleShare}>
            <MaterialIcons name="share" size={18} color={Colors.primary} />
            <Text style={styles.actionBtnTextSecondary}>Share</Text>
          </TouchableOpacity>
        </View>

        {action ? (
          <TouchableOpacity style={styles.openActionBtn} onPress={handleAction}>
            <MaterialIcons name={action.icon as any} size={20} color={Colors.white} />
            <Text style={styles.openActionText}>{action.label}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
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
  headerAction: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  headerActionActive: { backgroundColor: '#FFFBEB' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  typeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 16,
  },
  typeIconBox: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  typeLabel: { fontSize: 18, fontWeight: '700' },
  timestamp: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#06B6D4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  phoneBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.white },
  contentCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contentLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  contentText: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: Radius.lg },
  actionBtnPrimary: { backgroundColor: Colors.primary, ...Shadow.sm },
  actionBtnSecondary: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primary },
  actionBtnTextPrimary: { fontSize: 15, fontWeight: '600', color: Colors.white },
  actionBtnTextSecondary: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  openActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: '#3B82F6',
    marginBottom: 12,
    ...Shadow.sm,
  },
  openActionText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFoundText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary },
  backBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.lg },
  backBtnText: { fontSize: 15, fontWeight: '600', color: Colors.white },
});
