import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { StorageService, HistoryItem } from '@/services/storage';

interface QRDataContextType {
  history: HistoryItem[];
  favorites: HistoryItem[];
  scannedCount: number;
  generatedCount: number;
  scannedFromPhoneCount: number;
  totalCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'isFavorite'>) => Promise<HistoryItem>;
  toggleFavorite: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
}

export const QRDataContext = createContext<QRDataContextType | undefined>(undefined);

export function QRDataProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await StorageService.getHistory();
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(async (item: Omit<HistoryItem, 'id' | 'timestamp' | 'isFavorite'>) => {
    const newItem = await StorageService.addHistory(item);
    setHistory(prev => [newItem, ...prev].slice(0, 500));
    return newItem;
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    await StorageService.toggleFavorite(id);
    setHistory(prev =>
      prev.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item)
    );
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await StorageService.deleteHistory(id);
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearAllHistory = useCallback(async () => {
    await StorageService.clearHistory();
    setHistory([]);
  }, []);

  const favorites = history.filter(i => i.isFavorite);
  const scannedCount = history.filter(i => i.type === 'scanned').length;
  const generatedCount = history.filter(i => i.type === 'generated').length;
  const scannedFromPhoneCount = history.filter(i => i.type === 'scanned_from_phone').length;
  const totalCount = history.length;

  return (
    <QRDataContext.Provider value={{
      history,
      favorites,
      scannedCount,
      generatedCount,
      scannedFromPhoneCount,
      totalCount,
      loading,
      refresh,
      addItem,
      toggleFavorite,
      deleteItem,
      clearAllHistory,
    }}>
      {children}
    </QRDataContext.Provider>
  );
}
