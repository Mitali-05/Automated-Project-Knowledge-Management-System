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
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');

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
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary-indigo/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary-violet/15 blur-[120px] rounded-full pointer-events-none" />
      
      <PublicNavbar />

      <main className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-center max-w-6xl mx-auto w-full gap-12 lg:gap-24 px-4">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 hidden lg:flex flex-col items-center justify-center relative"
          >
            <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
              <motion.div 
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-5 left-10 w-16 h-16 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 flex items-center justify-center shadow-xl"
              >
                <div className="w-8 h-8 rounded-full bg-primary-indigo flex items-center justify-center">
                  <Shield size={16} className="text-white" />
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-20 right-5 w-14 h-14 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 flex items-center justify-center shadow-xl"
              >
                <div className="w-6 h-6 rounded-full bg-primary-blue flex items-center justify-center">
                  <Wifi size={14} className="text-white" />
                </div>
              </motion.div>
              
              <motion.div 
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute top-1/2 -right-4 w-12 h-12 bg-white/40 backdrop-blur-md rounded-xl border border-white/50 flex items-center justify-center shadow-xl"
              >
                <div className="w-5 h-5 rounded-full bg-primary-violet flex items-center justify-center">
                  <Briefcase size={12} className="text-white" />
                </div>
              </motion.div>

              <div className="relative w-64 h-72 bg-gradient-to-br from-primary-indigo via-primary-blue to-primary-violet rounded-[40px] flex items-center justify-center shadow-2xl z-10 border border-white/30 p-8">
                <Lock size={80} className="text-white drop-shadow-lg" />
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[400px] bg-white/40 backdrop-blur-3xl rounded-[50px] border border-white/60 shadow-2xl -z-10" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[300px] bg-white/20 backdrop-blur-xl rounded-[40px] border border-white/30 -z-20 rotate-12" />
            </div>

            <div className="mt-16 text-center max-w-sm">
              <h3 className="text-2xl font-bold text-text-primary mb-3">Your data is secure</h3>
              <p className="text-text-secondary">We use industry-standard encryption and security practices to keep your project data safe.</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 w-full max-w-md"
          >
            <div className="bg-white/70 backdrop-blur-xl py-8 px-8 shadow-2xl rounded-3xl border border-white/60 relative">
              
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
