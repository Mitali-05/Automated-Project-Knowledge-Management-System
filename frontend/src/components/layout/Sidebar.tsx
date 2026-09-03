import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderGit2, 
  Settings,
  HelpCircle,
  Database,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const mainLinks = [
    { name: 'Dashboard', path: '/app/overview', icon: LayoutDashboard },
    { name: 'Projects', path: '/app/projects/new', icon: FolderGit2 },
  ];

  const bottomLinks = [
    { name: 'Help', path: '/app/help', icon: HelpCircle },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 border-r border-surface-border bg-surface-card flex flex-col h-full sticky top-0">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-surface-border">
        <NavLink to="/app/overview" className="flex items-center gap-2 group">
          <div className="bg-primary-indigo text-white p-1.5 rounded-lg group-hover:bg-primary-violet transition-colors shadow-sm">
            <Database size={20} />
          </div>
          <span className="text-xl font-bold text-text-primary tracking-tight">CodeVault</span>
        </NavLink>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-8">
        <nav className="space-y-1">
          {mainLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-light-indigo/50 text-primary-indigo shadow-sm'
                    : 'text-text-secondary hover:bg-surface-background hover:text-text-primary'
                }`
              }
            >
              <link.icon size={18} className="shrink-0" />
              {link.name}
            </NavLink>
          ))}
        </nav>

        <nav className="space-y-1 mt-auto">
          {bottomLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-light-indigo/50 text-primary-indigo shadow-sm'
                    : 'text-text-secondary hover:bg-surface-background hover:text-text-primary'
                }`
              }
            >
              <link.icon size={18} className="shrink-0" />
              {link.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Upgrade Banner */}
      <div className="p-4 mx-4 mb-4 rounded-xl bg-primary-light-indigo/30 border border-primary-indigo/10">
        <h4 className="text-sm font-bold text-primary-indigo mb-1">Upgrade Plan</h4>
        <p className="text-xs text-text-secondary mb-3 leading-relaxed">
          Unlock advanced features and AI insights.
        </p>
        <Button 
          variant="primary" 
          size="sm" 
          className="w-full text-xs h-8 shadow-sm"
          onClick={() => alert("Upgrade billing flow would open here")}
        >
          Upgrade Now
        </Button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-surface-border relative" ref={profileRef}>
        <button 
          className="flex items-center gap-3 w-full hover:bg-surface-background p-2 rounded-lg transition-colors"
          onClick={() => setIsProfileOpen(!isProfileOpen)}
        >
          <img
            src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=7C6FF0&color=fff`}
            alt={user?.name || 'User Profile'}
            className="w-10 h-10 rounded-full bg-surface-border"
          />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-text-primary truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-text-secondary truncate">{user?.organizationName || 'Admin'}</p>
          </div>
          <ChevronDown size={16} className={`text-text-muted transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isProfileOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-xl border border-surface-border overflow-hidden z-50">
            <div className="p-2">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
