import React, { useState } from 'react';
import { User, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedPassword, setSavedPassword] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // API call would go here
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 3000);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    // API call would go here
    setSavedPassword(true);
    setCurrentPassword('');
    setNewPassword('');
    setTimeout(() => setSavedPassword(false), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-surface-background">
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Profile Settings</h1>
            <p className="text-sm text-text-secondary mt-1">Manage your account details and security.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Sidebar Navigation for Settings (Static for now) */}
            <div className="md:col-span-1 space-y-1">
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-light-indigo/30 text-primary-indigo">
                <User size={18} /> Profile Information
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-card transition-colors">
                <Lock size={18} /> Security & Password
              </button>
            </div>

            {/* Forms */}
            <div className="md:col-span-2 space-y-6">
              
              <Card>
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-lg font-bold text-text-primary mb-6">Profile Information</h3>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="flex items-center gap-6 mb-6">
                      <img
                        src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=7C6FF0&color=fff&size=80`}
                        alt="Profile"
                        className="w-20 h-20 rounded-full bg-surface-border shadow-sm"
                      />
                      <Button type="button" variant="outline" size="sm">Change Avatar</Button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        label="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        icon={<User size={16} />}
                      />
                      <Input
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={<Mail size={16} />}
                      />
                    </div>
                    <div className="pt-4 flex items-center gap-4">
                      <Button type="submit" className="shadow-sm">Save Changes</Button>
                      {savedProfile && (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                          <CheckCircle2 size={16} /> Saved successfully
                        </span>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-lg font-bold text-text-primary mb-6">Security & Password</h3>
                  <form onSubmit={handleSavePassword} className="space-y-4">
                    <Input
                      label="Current Password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      icon={<Lock size={16} />}
                    />
                    <Input
                      label="New Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      icon={<Lock size={16} />}
                    />
                    
                    <div className="pt-4 flex items-center gap-4">
                      <Button type="submit" className="shadow-sm">Update Password</Button>
                      {savedPassword && (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                          <CheckCircle2 size={16} /> Password updated
                        </span>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
