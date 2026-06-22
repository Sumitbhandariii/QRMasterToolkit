import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQRData } from '@/hooks/useQRData';
import { Colors, Spacing, Radius, Shadow, Typography } from '@/constants/theme';
import { HistoryItemCard } from '@/components/feature/HistoryItemCard';
import { AdBanner } from '@/components/ui/AdBanner';

const { width } = Dimensions.get('window');

const FEATURE_CHIPS = [
  { label: 'Flash Support', icon: 'bolt' as const, color: '#F59E0B' },
  { label: 'Front & Rear Cam', icon: 'flip-camera-android' as const, color: '#3B82F6' },
  { label: 'WiFi QR', icon: 'wifi' as const, color: '#8B5CF6' },
  { label: 'UPI QR', icon: 'payment' as const, color: '#16A34A' },
  { label: 'Share & Export', icon: 'share' as const, color: '#EF4444' },
  { label: 'Favorites', icon: 'star' as const, color: '#F59E0B' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { history, totalCount, scannedCount, generatedCount, favorites } = useQRData();

  const recentItems = history.slice(0, 5);

  const QUICK_ACTIONS = [
    { label: 'Scan QR', subtitle: 'Scan any QR code', icon: 'document-scanner' as const, color: Colors.primary, bg: Colors.cardScan, route: '/(tabs)/scan' },
    { label: 'Barcode', subtitle: 'Scan barcodes', icon: 'menu' as const, color: '#3B82F6', bg: Colors.cardBarcode, route: '/(tabs)/scan' },
    { label: 'Generate QR', subtitle: 'Create QR codes', icon: 'add-circle' as const, color: '#8B5CF6', bg: Colors.cardGenerate, route: '/(tabs)/generate' },
    { label: 'History', subtitle: 'View all history', icon: 'history' as const, color: '#F59E0B', bg: Colors.cardHistory, route: '/(tabs)/history' },
    { label: 'Favorites', subtitle: 'Starred items', icon: 'star' as const, color: '#F97316', bg: Colors.cardFavorites, route: '/(tabs)/favorites' },
    { label: 'Scan From Photo', subtitle: 'Scan from gallery', icon: 'collections' as const, color: '#06B6D4', bg: Colors.cardPhone, route: '/scan-from-phone' },
  ];

  const handleAction = useCallback((route: string) => {
    router.push(route as any);
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>QR Master</Text>
            <Text style={styles.appSubtitle}>Toolkit for all your QR needs</Text>
          </View>
        </View>

        {/* Hero Banner */}
        <TouchableOpacity style={styles.heroBanner} onPress={() => router.push('/(tabs)/history')} activeOpacity={0.9}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>All-in-one</Text>
          </View>
          <Text style={styles.heroTitle}>{'Scan & Generate\nQR Codes Instantly'}</Text>
          <Text style={styles.heroSubtitle}>
            {totalCount > 0 ? `${totalCount} items scanned/generated` : 'Start scanning or generating now'}
          </Text>
          <View style={styles.heroQRPattern}>
            <MaterialIcons name="crop-free" size={80} color="rgba(255,255,255,0.15)" />
          </View>
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/history')}>
            <MaterialIcons name="history" size={22} color={Colors.primary} />
            <Text style={styles.statNumber}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/favorites')}>
            <MaterialIcons name="star" size={22} color="#F59E0B" />
            <Text style={styles.statNumber}>{favorites.length}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/history')}>
            <MaterialIcons name="document-scanner" size={22} color="#3B82F6" />
            <Text style={styles.statNumber}>{scannedCount}</Text>
            <Text style={styles.statLabel}>Scanned</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionCard, { backgroundColor: action.bg }]}
              onPress={() => handleAction(action.route)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBox, { backgroundColor: action.color + '22' }]}>
                <MaterialIcons name={action.icon} size={28} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ad Banner */}
        <AdBanner placement="home" />

        {/* Feature Chips */}
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.chipsWrap}>
          {FEATURE_CHIPS.map((chip) => (
            <View key={chip.label} style={styles.featureChip}>
              <MaterialIcons name={chip.icon} size={14} color={chip.color} />
              <Text style={styles.chipText}>{chip.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent History */}
        {recentItems.length > 0 && (
          <View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Recent</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentItems.map(item => (
              <HistoryItemCard
                key={item.id}
                item={item}
                onPress={() => {
                  if (item.type === 'generated') {
                    router.push({ pathname: '/generate-detail', params: { id: item.id } });
                  } else {
                    router.push({ pathname: '/scan-detail', params: { id: item.id } });
                  }
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  appTitle: { fontSize: 28, fontWeight: '700', color: Colors.text },
  appSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  heroBanner: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.white },
  heroTitle: { fontSize: 24, fontWeight: '700', color: Colors.white, lineHeight: 32 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
  heroQRPattern: { position: 'absolute', right: -10, bottom: -10, opacity: 0.6 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  statNumber: { fontSize: 22, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  viewAll: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  actionCard: {
    width: (width - Spacing.lg * 2 - Spacing.sm) / 2,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  actionIconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionLabel: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  actionSubtitle: { fontSize: 12, color: Colors.textSecondary },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.xl },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 12, fontWeight: '500', color: Colors.text },
});
