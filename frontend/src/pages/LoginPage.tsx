import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, ChevronRight, AlertCircle, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

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
      {/* Decorative Gradients for Glassmorphism Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-indigo/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary-blue/20 blur-[120px] rounded-full pointer-events-none" />
      
      <PublicNavbar />

      <main className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-center max-w-6xl mx-auto w-full gap-12 lg:gap-24 px-4">
          
          {/* Left Side: Marketing / Glass Visuals */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 hidden lg:flex flex-col items-center justify-center relative"
          >
            <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
              {/* Floating elements */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 right-10 w-16 h-16 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 flex items-center justify-center shadow-xl"
              >
                <div className="w-8 h-8 rounded-full bg-primary-indigo flex items-center justify-center">
                  <Shield size={16} className="text-white" />
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 15, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-10 left-10 w-14 h-14 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 flex items-center justify-center shadow-xl"
              >
                <div className="w-6 h-6 rounded-full bg-primary-blue flex items-center justify-center">
                  <Wifi size={14} className="text-white" />
                </div>
              </motion.div>

              {/* Main Center Glass Shield */}
              <div className="relative w-64 h-72 bg-gradient-to-br from-primary-indigo to-primary-violet rounded-[40px] flex items-center justify-center shadow-2xl z-10 border border-white/20 p-8">
                <Lock size={80} className="text-white drop-shadow-md" />
              </div>

              {/* Glass Backing Plate */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-96 bg-white/30 backdrop-blur-2xl rounded-[50px] border border-white/50 shadow-2xl -z-10" />
            </div>

            <div className="mt-12 text-center max-w-sm">
              <h3 className="text-2xl font-bold text-text-primary mb-3">Your data is secure</h3>
              <p className="text-text-secondary">We use industry-standard encryption and security practices to keep your project data safe.</p>
            </div>
          </motion.div>

          {/* Right Side: Login Form */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 w-full max-w-md"
          >
            {/* Glassmorphism Form Container */}
            <div className="bg-white/70 backdrop-blur-xl py-10 px-8 shadow-2xl rounded-3xl border border-white/60">
              <div className="mb-8">
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
                <Link to="/register" className="font-medium text-primary-indigo hover:text-primary-violet transition-colors inline-flex items-center gap-1">
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
