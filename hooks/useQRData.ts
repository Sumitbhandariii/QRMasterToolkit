import { useContext } from 'react';
import { QRDataContext } from '@/contexts/QRDataContext';

export function useQRData() {
  const context = useContext(QRDataContext);
  if (!context) throw new Error('useQRData must be used within QRDataProvider');
  return context;
}
