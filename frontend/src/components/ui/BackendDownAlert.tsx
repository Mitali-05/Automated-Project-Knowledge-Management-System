import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export const BackendDownAlert: React.FC = () => {
  const [isBackendDown, setIsBackendDown] = useState(false);

  useEffect(() => {
    const handleBackendDown = () => {
      setIsBackendDown(true);
      // Auto-hide after 10 seconds
      setTimeout(() => setIsBackendDown(false), 10000);
    };

    window.addEventListener('backend-down', handleBackendDown);
    return () => {
      window.removeEventListener('backend-down', handleBackendDown);
    };
  }, []);

  if (!isBackendDown) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-surface-card border border-red-500/50 shadow-2xl rounded-xl p-4 w-80 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-red-500 mt-0.5">
          <AlertCircle size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary">Connection Lost</h3>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Cannot reach the PRISM backend server. Please ensure the server is running on port 8081.
          </p>
        </div>
        <button 
          onClick={() => setIsBackendDown(false)}
          className="ml-auto flex-shrink-0 text-text-muted hover:text-text-primary transition-colors"
        >
          &times;
        </button>
      </div>
    </div>
  );
};
