import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Database } from 'lucide-react';
import { Button } from '../ui/Button';

export const PublicNavbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? "text-primary-indigo" : "text-text-secondary hover:text-primary-indigo";
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface-card/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-blue to-primary-violet text-white shadow-sm">
            <Database size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight text-text-primary">
            Code<span className="text-primary-indigo">Vault</span>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/features" className={`transition-colors ${isActive('/features')}`}>Features</Link>
          <Link to="/how-it-works" className={`transition-colors ${isActive('/how-it-works')}`}>How It Works</Link>
          <Link to="/about" className={`transition-colors ${isActive('/about')}`}>About</Link>
          <Link to="/login" className="text-text-secondary hover:text-primary-indigo transition-colors">Login</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/register">
            <Button variant="primary">Get Started</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};
