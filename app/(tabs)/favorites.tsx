import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQRData } from '@/hooks/useQRData';
import { HistoryItem } from '@/services/storage';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';
import { HistoryItemCard } from '@/components/feature/HistoryItemCard';
import { useAlert } from '@/template';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { favorites, deleteItem } = useQRData();

  const handleItemPress = useCallback((item: HistoryItem) => {
    if (item.type === 'generated') {
      router.push({ pathname: '/generate-detail', params: { id: item.id } });
    } else {
      router.push({ pathname: '/scan-detail', params: { id: item.id } });
    }
  }, [router]);

  const handleDelete = useCallback((id: string) => {
    showAlert('Remove Favorite', 'Remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteItem(id) },
    ]);
  }, [deleteItem, showAlert]);

  const renderItem = useCallback(({ item }: { item: HistoryItem }) => (
    <HistoryItemCard
      item={item}
      onPress={() => handleItemPress(item)}
      onDelete={() => handleDelete(item.id)}
    />
  ), [handleItemPress, handleDelete]);

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <MaterialIcons name="star" size={56} color="#F59E0B" />
      </View>
      <Text style={styles.emptyTitle}>No Favorites Yet</Text>
      <Text style={styles.emptySubtitle}>
        Star any scanned or generated QR code to save it here for quick access.
      </Text>
      <TouchableOpacity style={styles.scanBtn} onPress={() => router.push('/(tabs)/scan')}>
        <MaterialIcons name="document-scanner" size={18} color={Colors.white} />
        <Text style={styles.scanBtnText}>Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Favorites</Text>
          {favorites.length > 0 && (
            <Text style={styles.headerSub}>{favorites.length} starred item{favorites.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <View style={styles.starBadge}>
          <MaterialIcons name="star" size={20} color="#F59E0B" />
        </View>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          favorites.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  starBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  listEmpty: { flex: 1 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    ...Shadow.md,
  },
  scanBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
