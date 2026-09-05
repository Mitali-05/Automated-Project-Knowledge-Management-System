import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '../../api/client';

export const GithubCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      const installationId = searchParams.get('installation_id');
      
      if (!installationId) {
        setStatus('error');
        setErrorMessage('No installation ID found in the URL. Installation may have failed or been cancelled.');
        return;
      }

      try {
        await apiClient.post('/integrations/github/callback', {
          installation_id: installationId
        });
        
        setStatus('success');
        
        // Redirect back to create project page after a short delay
        setTimeout(() => {
          navigate('/app/projects/new');
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.response?.data?.message || 'Failed to complete GitHub App installation.');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-background">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-surface-card border border-surface-border rounded-xl p-8 shadow-2xl text-center"
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 size={48} className="text-primary-indigo animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">Connecting to GitHub</h2>
            <p className="text-text-secondary">Please wait while we finalize your installation...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Successfully Connected!</h2>
            <p className="text-text-secondary mb-6">Your GitHub App has been successfully installed.</p>
            <p className="text-sm text-text-muted">Redirecting you to the dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Connection Failed</h2>
            <p className="text-text-secondary mb-6">{errorMessage}</p>
            <button 
              onClick={() => navigate('/app')}
              className="px-6 py-2 bg-surface-background border border-surface-border rounded-lg text-text-primary hover:text-primary-indigo transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
