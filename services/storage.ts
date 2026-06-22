import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '@/constants/config';

export type HistoryCategory = 'scanned' | 'generated' | 'scanned_from_phone';

export interface HistoryItem {
  id: string;
  type: HistoryCategory;
  content: string;
  title: string;
  subtitle?: string;
  qrType?: string;
  timestamp: number;
  isFavorite: boolean;
  rawData?: string;
}

export const StorageService = {
  async getHistory(): Promise<HistoryItem[]> {
    try {
      const data = await AsyncStorage.getItem(APP_CONFIG.HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async addHistory(item: Omit<HistoryItem, 'id' | 'timestamp' | 'isFavorite'>): Promise<HistoryItem> {
    try {
      const history = await StorageService.getHistory();
      const newItem: HistoryItem = {
        ...item,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        isFavorite: false,
      };
      const updated = [newItem, ...history].slice(0, APP_CONFIG.MAX_HISTORY);
      await AsyncStorage.setItem(APP_CONFIG.HISTORY_KEY, JSON.stringify(updated));
      return newItem;
    } catch {
      throw new Error('Failed to save history');
    }
  },

  async toggleFavorite(id: string): Promise<boolean> {
    try {
      const history = await StorageService.getHistory();
      const updated = history.map(item =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );
      await AsyncStorage.setItem(APP_CONFIG.HISTORY_KEY, JSON.stringify(updated));
      const item = updated.find(i => i.id === id);
      return item?.isFavorite ?? false;
    } catch {
      return false;
    }
  },

  async deleteHistory(id: string): Promise<void> {
    try {
      const history = await StorageService.getHistory();
      const updated = history.filter(item => item.id !== id);
      await AsyncStorage.setItem(APP_CONFIG.HISTORY_KEY, JSON.stringify(updated));
    } catch {
      throw new Error('Failed to delete history');
    }
  },

  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(APP_CONFIG.HISTORY_KEY, JSON.stringify([]));
    } catch {
      throw new Error('Failed to clear history');
    }
  },

  async getFavorites(): Promise<HistoryItem[]> {
    try {
      const history = await StorageService.getHistory();
      return history.filter(item => item.isFavorite);
    } catch {
      return [];
    }
  },

  async isOnboardingDone(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(APP_CONFIG.ONBOARDING_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  },

  async setOnboardingDone(): Promise<void> {
    try {
      await AsyncStorage.setItem(APP_CONFIG.ONBOARDING_KEY, 'true');
    } catch {}
  },

  async getScanCount(): Promise<number> {
    try {
      const val = await AsyncStorage.getItem(APP_CONFIG.SCAN_COUNT_KEY);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  },

  async incrementScanCount(): Promise<number> {
    try {
      const count = await StorageService.getScanCount();
      const newCount = count + 1;
      await AsyncStorage.setItem(APP_CONFIG.SCAN_COUNT_KEY, String(newCount));
      return newCount;
    } catch {
      return 0;
    }
  },

  async getGenerateCount(): Promise<number> {
    try {
      const val = await AsyncStorage.getItem(APP_CONFIG.GENERATE_COUNT_KEY);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  },

  async incrementGenerateCount(): Promise<number> {
    try {
      const count = await StorageService.getGenerateCount();
      const newCount = count + 1;
      await AsyncStorage.setItem(APP_CONFIG.GENERATE_COUNT_KEY, String(newCount));
      return newCount;
    } catch {
      return 0;
    }
  },
};
