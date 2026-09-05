import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Wifi, AlertCircle, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Frontend Validation
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await register(name, email, password, organizationName);
      navigate('/app/overview');
    } catch (err: any) {
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-background selection:bg-primary-indigo selection:text-white relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary-indigo/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-blue/20 blur-[120px] rounded-full pointer-events-none" />

      <PublicNavbar />

      <main className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-center max-w-6xl mx-auto w-full gap-12 lg:gap-24 px-4 relative">
          
          {/* Subtle Vertical Divider (desktop only) */}
          <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-[80%] bg-gradient-to-b from-transparent via-surface-border to-transparent"></div>

          {/* Left Side: Marketing / Glass Visuals */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 hidden lg:flex flex-col items-center justify-center relative"
          >
            <div className="relative w-full max-w-md flex flex-col items-center justify-center">
              {/* Glowing Tilted Card Effect with reduced border/padding */}
              <div className="relative rounded-xl border border-surface-border bg-surface-card shadow-2xl p-2 transform -rotate-1 hover:rotate-0 transition-transform duration-500 w-full">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary-blue via-primary-indigo to-primary-violet opacity-20 blur-lg"></div>
                {/* Changed to use the full PRISM logo image as requested */}
                <img src="/prism-logo.png" alt="PRISM Logo" className="relative z-10 w-full h-auto object-contain rounded-lg bg-white" />
              </div>
            </div>

            <div className="mt-12 text-center max-w-md">
              <h3 className="text-2xl font-bold text-text-primary mb-3">Your data is secure</h3>
              <p className="text-text-secondary leading-relaxed">We use industry-standard encryption and security practices to keep your project data safe.</p>
            </div>
          </motion.div>

          {/* Right Side: Register Form */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 w-full max-w-md mx-auto"
          >
            {/* Glassmorphism Form Container */}
            <div className="bg-surface-card/70 backdrop-blur-xl py-10 px-8 shadow-2xl rounded-3xl border border-surface-border relative">
              
              <div className="absolute right-6 top-6 text-sm">
                <span className="text-text-secondary">Already have an account? </span>
                <Link to="/login" className="font-medium text-primary-indigo hover:text-primary-violet transition-colors">
                  Login
                </Link>
              </div>

              <div className="mb-6 mt-4">
                <h2 className="text-2xl font-bold text-text-primary">Create your account</h2>
                <p className="text-sm text-text-secondary mt-1">Join your team and start managing project knowledge.</p>
              </div>

              <form className="space-y-4" onSubmit={handleRegister}>
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2 border border-red-100">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <Input label="Full Name" type="text" placeholder="Enter your full name" required value={name} onChange={(e) => setName(e.target.value)} className="bg-white/50 border-white/60 focus:bg-white" />
                <Input label="Email Address" type="email" placeholder="Enter your email address" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/50 border-white/60 focus:bg-white" />
                <Input label="Organization" type="text" placeholder="Enter your organization name" required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className="bg-white/50 border-white/60 focus:bg-white" />
                <Input label="Password" type="password" placeholder="Create a password" required value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/50 border-white/60 focus:bg-white" />
                <Input label="Confirm Password" type="password" placeholder="Confirm your password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-white/50 border-white/60 focus:bg-white" />

                <div className="flex items-start pt-2">
                  <div className="flex items-center h-5">
                    <input id="terms" name="terms" type="checkbox" required className="h-4 w-4 text-primary-indigo focus:ring-primary-indigo border-gray-300 rounded cursor-pointer" />
                  </div>
                  <div className="ml-2 text-sm">
                    <label htmlFor="terms" className="text-text-secondary cursor-pointer">
                      I agree to the <a href="#" className="font-medium text-primary-indigo hover:text-primary-violet">Terms of Service</a> and <a href="#" className="font-medium text-primary-indigo hover:text-primary-violet">Privacy Policy</a>
                    </label>
                  </div>
                </div>

                <Button type="submit" className="w-full text-base h-12 mt-2 shadow-lg shadow-primary-indigo/30" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
