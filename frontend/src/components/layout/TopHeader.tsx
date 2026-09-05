import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu, Check } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export const TopHeader: React.FC = () => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleNotificationClick = (notif: any) => {
    setSelectedNotification(notif);
    setIsNotificationsOpen(false);
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
  };

  return (
    <>
      <header className="h-16 shrink-0 border-b border-surface-border bg-surface-card px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        {/* Left side: Mobile menu & Breadcrumbs/Title */}
        <div className="flex items-center gap-4">
          <button className="md:hidden text-text-secondary hover:text-text-primary">
            <Menu size={20} />
          </button>
          <div className="hidden sm:flex items-center text-sm font-medium text-text-primary">
            <span>PRISM Workspace</span>
            <span className="mx-2 text-text-muted">/</span>
            <span className="text-text-secondary">Overview</span>
          </div>
        </div>

        {/* Right side: Search & Actions */}
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="h-9 w-64 rounded-md border border-surface-border bg-surface-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-indigo"
            />
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative rounded-full p-2 text-text-secondary hover:bg-surface-background transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-indigo opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-indigo"></span>
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-lg border border-surface-border bg-surface-card shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between border-b border-surface-border px-4 py-3 bg-surface-background">
                  <h3 className="font-semibold text-text-primary text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAllAsRead()}
                      className="text-xs text-primary-indigo hover:text-primary-violet flex items-center gap-1"
                    >
                      <Check size={12} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-text-secondary">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-4 border-b border-surface-border hover:bg-surface-background/50 cursor-pointer transition-colors ${!notif.isRead ? 'bg-surface-background/30' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-sm font-medium ${!notif.isRead ? 'text-primary-indigo' : 'text-text-primary'}`}>{notif.title}</span>
                          <span className="text-xs text-text-muted">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-text-secondary line-clamp-2">{notif.description}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-surface-border p-2 bg-surface-background text-center">
                  <button 
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-xs font-medium text-primary-indigo hover:text-primary-violet w-full py-1"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notification Details Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-card w-full max-w-md rounded-2xl shadow-xl border border-surface-border overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-text-primary">{selectedNotification.title}</h3>
                <span className="text-sm text-text-muted">{new Date(selectedNotification.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-text-secondary leading-relaxed mb-6 whitespace-pre-wrap">
                {selectedNotification.description}
              </p>
              <button 
                onClick={() => setSelectedNotification(null)}
                className="w-full h-10 bg-primary-indigo text-white rounded-lg font-medium hover:bg-primary-violet transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

