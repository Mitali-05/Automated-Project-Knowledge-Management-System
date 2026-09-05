import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

// 30 minutes in milliseconds
const INACTIVITY_LIMIT = 30 * 60 * 1000;
// 60 seconds warning
const WARNING_LIMIT = 60 * 1000;

export const ActivityTracker: React.FC = () => {
  const { logout, isAuthenticated } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;
    let warningInterval: NodeJS.Timeout;
    
    const resetTimer = () => {
      setShowWarning(false);
      setCountdown(60);
      clearTimeout(timeoutId);
      clearInterval(warningInterval);
      
      timeoutId = setTimeout(() => {
        setShowWarning(true);
        warningInterval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              logout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, INACTIVITY_LIMIT - WARNING_LIMIT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach(event => document.addEventListener(event, handleActivity));
    resetTimer();

    // Listen for auth-expired globally
    const handleAuthExpired = () => logout();
    window.addEventListener('auth-expired', handleAuthExpired);

    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
      window.removeEventListener('auth-expired', handleAuthExpired);
      clearTimeout(timeoutId);
      clearInterval(warningInterval);
    };
  }, [isAuthenticated, logout, showWarning]);

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="bg-surface-card w-full max-w-md p-6 rounded-2xl shadow-2xl border border-surface-border text-center"
          >
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-warning" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Are you still there?</h2>
            <p className="text-text-secondary mb-6">
              For your security, you will be automatically logged out due to inactivity in <span className="font-bold text-warning">{countdown}s</span>.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={logout}>
                Log Out Now
              </Button>
              <Button
                className="flex-1 bg-primary-indigo hover:bg-primary-violet text-white"
                onClick={() => {
                  setShowWarning(false);
                  setCountdown(60);
                  // Simulate an activity to reset the timer
                  document.dispatchEvent(new Event('mousemove'));
                }}
              >
                Keep me logged in
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
