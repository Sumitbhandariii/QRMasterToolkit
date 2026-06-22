import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQRData } from '@/hooks/useQRData';
import { HistoryItem } from '@/services/storage';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';
import { HistoryItemCard } from '@/components/feature/HistoryItemCard';
import { AdBanner } from '@/components/ui/AdBanner';
import { useAlert } from '@/template';

type TabKey = 'all' | 'scanned' | 'generated' | 'phone';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'list' },
  { key: 'scanned', label: 'Scanned', icon: 'document-scanner' },
  { key: 'generated', label: 'Generated', icon: 'add-circle' },
  { key: 'phone', label: 'From Phone', icon: 'collections' },
];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert } = useAlert();
  const { history, deleteItem, clearAllHistory, loading } = useQRData();

  const initialTab: TabKey = (params.tab as TabKey) || 'all';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useCallback(() => {
    switch (activeTab) {
      case 'scanned': return history.filter(i => i.type === 'scanned');
      case 'generated': return history.filter(i => i.type === 'generated');
      case 'phone': return history.filter(i => i.type === 'scanned_from_phone');
      default: return history;
    }
  }, [history, activeTab])();

  const searchedItems = searchQuery.trim()
    ? filteredItems.filter(i =>
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredItems;

  const handleDelete = useCallback((id: string) => {
    showAlert('Delete Item', 'Remove this item from history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteItem(id) },
    ]);
  }, [deleteItem, showAlert]);

  const handleClearAll = useCallback(() => {
    if (history.length === 0) return;
    showAlert('Clear All History', 'This will permanently delete all history items.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearAllHistory },
    ]);
  }, [history.length, clearAllHistory, showAlert]);

  const handleItemPress = useCallback((item: HistoryItem) => {
    if (item.type === 'generated') {
      router.push({ pathname: '/generate-detail', params: { id: item.id } });
    } else {
      router.push({ pathname: '/scan-detail', params: { id: item.id } });
    }
  }, [router]);

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
        <MaterialIcons
          name={searchQuery.trim() ? 'search' : 'history'}
          size={56}
          color={Colors.primaryLight}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {searchQuery.trim() ? 'No results found' : 'No items yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery.trim()
          ? `No history matches "${searchQuery}"`
          : activeTab === 'scanned' ? 'Scan QR codes and barcodes to see them here'
          : activeTab === 'generated' ? 'Generate QR codes to see them here'
          : activeTab === 'phone' ? 'Scan QR codes from your gallery to see them here'
          : 'Scan or generate QR codes to build your history'}
      </Text>
      {searchQuery.trim() ? (
        <TouchableOpacity style={styles.clearSearchBtn} onPress={() => setSearchQuery('')}>
          <Text style={styles.clearSearchText}>Clear Search</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <MaterialIcons name="delete" size={20} color={Colors.error} />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search history..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="cancel" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map(tab => {
          const count = tab.key === 'all' ? history.length :
            tab.key === 'scanned' ? history.filter(i => i.type === 'scanned').length :
            tab.key === 'generated' ? history.filter(i => i.type === 'generated').length :
            history.filter(i => i.type === 'scanned_from_phone').length;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={searchedItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          filteredItems.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={<AdBanner placement="history" />}
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
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: '#FFF5F5',
  },
  clearText: { fontSize: 13, fontWeight: '600', color: Colors.error },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  tabBadge: {
    backgroundColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.textSecondary },
  tabBadgeTextActive: { color: Colors.white },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  listEmpty: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
  },
  clearSearchText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
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
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
