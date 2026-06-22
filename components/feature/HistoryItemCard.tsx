import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { HistoryItem } from '@/services/storage';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { useQRData } from '@/hooks/useQRData';

interface Props {
  item: HistoryItem;
  onPress: () => void;
  onDelete?: () => void;
}

function getTypeInfo(item: HistoryItem) {
  if (item.type === 'generated') return { icon: 'add-circle' as const, color: Colors.primary, bg: Colors.primaryLight, label: 'Gen' };
  if (item.type === 'scanned_from_phone') return { icon: 'collections' as const, color: '#06B6D4', bg: '#ECFEFF', label: 'Gallery' };
  return { icon: 'document-scanner' as const, color: '#3B82F6', bg: '#EFF6FF', label: 'Scan' };
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function HistoryItemCard({ item, onPress, onDelete }: Props) {
  const { toggleFavorite } = useQRData();
  const typeInfo = getTypeInfo(item);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.iconBox, { backgroundColor: typeInfo.bg }]}>
        <MaterialIcons name={typeInfo.icon} size={22} color={typeInfo.color} />
      </View>
      <View style={styles.textArea}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        {item.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
        ) : null}
      </View>
      <View style={styles.rightArea}>
        <TouchableOpacity
          style={styles.starBtn}
          onPress={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons
            name={item.isFavorite ? 'star' : 'star-outline'}
            size={18}
            color={item.isFavorite ? '#F59E0B' : Colors.textMuted}
          />
        </TouchableOpacity>
        <View style={[styles.typePill, { backgroundColor: typeInfo.color + '20' }]}>
          <Text style={[styles.typePillText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    ...Shadow.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textArea: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600', color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textSecondary },
  rightArea: { alignItems: 'flex-end', gap: 4 },
  starBtn: { padding: 2 },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  typePillText: { fontSize: 11, fontWeight: '700' },
});
