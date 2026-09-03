import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu, Check } from 'lucide-react';

export const TopHeader: React.FC = () => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
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

  return (
    <header className="h-16 shrink-0 border-b border-surface-border bg-surface-card px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left side: Mobile menu & Breadcrumbs/Title */}
      <div className="flex items-center gap-4">
        <button className="md:hidden text-text-secondary hover:text-text-primary">
          <Menu size={20} />
        </button>
        <div className="hidden sm:flex items-center text-sm font-medium text-text-primary">
          <span>Acme Technologies</span>
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
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-indigo opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-indigo"></span>
            </span>
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-surface-border bg-surface-card shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between border-b border-surface-border px-4 py-3 bg-surface-background">
                <h3 className="font-semibold text-text-primary text-sm">Notifications</h3>
                <button className="text-xs text-primary-indigo hover:text-primary-violet flex items-center gap-1">
                  <Check size={12} /> Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <div className="p-4 border-b border-surface-border hover:bg-surface-background/50 cursor-pointer transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-text-primary">Knowledge Gap Detected</span>
                    <span className="text-xs text-text-muted">1h ago</span>
                  </div>
                  <p className="text-xs text-text-secondary">3 modules in Payment Service are missing documentation.</p>
                </div>
                <div className="p-4 hover:bg-surface-background/50 cursor-pointer transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-text-primary">Sync Completed</span>
                    <span className="text-xs text-text-muted">2h ago</span>
                  </div>
                  <p className="text-xs text-text-secondary">Customer Portal successfully synced from GitHub.</p>
                </div>
              </div>
              <div className="border-t border-surface-border p-2 bg-surface-background text-center">
                <button className="text-xs font-medium text-primary-indigo hover:text-primary-violet w-full py-1">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
