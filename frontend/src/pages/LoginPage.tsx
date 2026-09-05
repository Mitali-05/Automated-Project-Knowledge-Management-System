import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { GridCube } from '../components/ui/GridCube';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/app/overview" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Frontend Validation
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/app/overview');
    } catch (err: any) {
      setError('Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-background selection:bg-primary-indigo selection:text-white relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-indigo/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary-blue/20 blur-[120px] rounded-full pointer-events-none" />
      
      <PublicNavbar />

      <main className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-center max-w-6xl mx-auto w-full gap-12 lg:gap-24 px-4 relative">
          
          {/* Subtle Vertical Divider (desktop only) */}
          <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-[80%] bg-gradient-to-b from-transparent via-surface-border to-transparent"></div>

          {/* Left Side: Illustration */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 hidden lg:flex flex-col items-center justify-center relative"
          >
            <div className="relative w-full max-w-sm flex justify-center">
              {/* Glowing Tilted Card Effect with reduced border/padding */}
              <div className="relative rounded-xl border border-surface-border bg-surface-card shadow-2xl p-2 transform -rotate-1 hover:rotate-0 transition-transform duration-500 w-full flex justify-center">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary-blue via-primary-indigo to-primary-violet opacity-20 blur-lg"></div>
                <img src="/lock-illustration.jpg" alt="PRISM Security Lock" className="relative z-10 w-80 h-auto object-contain mix-blend-darken" />
              </div>
            </div>

            <div className="mt-8 text-center max-w-sm">
              <h3 className="text-2xl font-bold text-text-primary mb-3">Welcome to PRISM</h3>
              <p className="text-text-secondary leading-relaxed">Your intelligent Project Knowledge Management System powered by AI and Agentic RAG.</p>
            </div>
          </motion.div>

          {/* Right Side: Login Form */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 w-full max-w-md mx-auto"
          >
            {/* Glassmorphism Form Container */}
            <div className="bg-surface-card/70 backdrop-blur-xl py-10 px-8 shadow-2xl rounded-3xl border border-surface-border">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-text-primary">Welcome back</h2>
                <p className="text-sm text-text-secondary mt-2">Sign in to your team workspace</p>
              </div>

              <form className="space-y-6" onSubmit={handleLogin}>
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2 border border-red-100">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="Enter your email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/50 border-white/60 focus:bg-white"
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/50 border-white/60 focus:bg-white"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-primary-indigo focus:ring-primary-indigo border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-text-secondary cursor-pointer">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium text-primary-indigo hover:text-primary-violet transition-colors">
                      Forgot password?
                    </a>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full text-base h-12 mt-4 shadow-lg shadow-primary-indigo/30"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-8 text-center text-sm text-text-secondary">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-primary-indigo hover:text-primary-violet transition-colors inline-flex items-center justify-center gap-1">
                  Create Account <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
