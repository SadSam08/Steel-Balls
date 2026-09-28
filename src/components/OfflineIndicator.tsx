import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-200 px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 animate-pulse">
      <WifiOff size={14} className="text-amber-400" />
      <span>Working Offline (Changes will sync when online)</span>
    </div>
  );
};
