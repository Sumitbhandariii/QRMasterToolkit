import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StorageService } from '@/services/storage';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 0,
    title: 'Welcome to\nQR Master Toolkit',
    subtitle: 'Your all-in-one solution for QR codes and barcodes. Powerful, fast, and beautiful.',
    icon: 'document-scanner' as const,
    color: Colors.primary,
    bg: '#F0FDF4',
  },
  {
    id: 1,
    title: 'Scan QR Codes\nInstantly',
    subtitle: 'Ultra-fast scanner with auto-focus, flashlight support, and both front & rear cameras.',
    icon: 'crop-free' as const,
    color: '#3B82F6',
    bg: '#EFF6FF',
  },
  {
    id: 2,
    title: 'Generate QR Codes\nEasily',
    subtitle: 'Create QR codes for text, URLs, WiFi, contacts, UPI, location, and more in seconds.',
    icon: 'add-circle' as const,
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
  {
    id: 3,
    title: 'Scan From Gallery\nImages',
    subtitle: 'Pick any photo from your gallery and instantly decode QR codes and barcodes from images.',
    icon: 'collections' as const,
    color: '#F59E0B',
    bg: '#FFFBEB',
  },
  {
    id: 4,
    title: 'Manage History\n& Favorites',
    subtitle: 'All your scanned and generated codes are saved. Star your favorites for quick access.',
    icon: 'history' as const,
    color: '#EF4444',
    bg: '#FFF5F5',
  },
  {
    id: 5,
    title: 'Ready to Get\nStarted!',
    subtitle: 'Tap Get Started to begin your QR journey. Scan, generate, and manage codes like a pro.',
    icon: 'flight-takeoff' as const,
    color: Colors.primary,
    bg: '#F0FDF4',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToSlide = (index: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, index));
    setCurrentIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
  };

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const handleGetStarted = async () => {
    await StorageService.setOnboardingDone();
    router.replace('/(tabs)');
  };

  const handleSkip = async () => {
    await StorageService.setOnboardingDone();
    router.replace('/(tabs)');
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: insets.top + 12 }]}
          onPress={handleSkip}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={{ width: width * SLIDES.length }}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            <View style={[styles.iconContainer, { backgroundColor: slide.bg }]}>
              <View style={[styles.iconCircle, { backgroundColor: slide.color + '20' }]}>
                <MaterialIcons name={slide.icon} size={72} color={slide.color} />
              </View>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
            <View
              style={[
                styles.dot,
                { backgroundColor: i === currentIndex ? Colors.primary : Colors.border, width: i === currentIndex ? 24 : 8 },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Buttons */}
      <View style={[styles.btnRow, { paddingBottom: insets.bottom + 16 }]}>
        {currentIndex > 0 ? (
          <TouchableOpacity style={styles.prevBtn} onPress={() => goToSlide(currentIndex - 1)}>
            <MaterialIcons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.prevText}>Previous</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {isLast ? (
          <TouchableOpacity style={styles.getStartedBtn} onPress={handleGetStarted}>
            <Text style={styles.getStartedText}>Get Started</Text>
            <MaterialIcons name="arrow-forward" size={20} color={Colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={() => goToSlide(currentIndex + 1)}>
            <Text style={styles.nextText}>Next</Text>
            <MaterialIcons name="arrow-forward" size={20} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: Radius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  btnRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    alignItems: 'center',
  },
  prevBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  prevText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    ...Shadow.md,
  },
  nextText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  getStartedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    ...Shadow.md,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});
