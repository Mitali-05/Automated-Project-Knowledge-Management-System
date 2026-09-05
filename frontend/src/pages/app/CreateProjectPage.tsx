import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const CreateProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Repo selection state
  const [repoType, setRepoType] = useState<'public' | 'private'>('public');
  const [githubUrl, setGithubUrl] = useState('');
  const [selectedPrivateRepo, setSelectedPrivateRepo] = useState('');
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiClient.get('/integrations/github/repositories');
        if (response.data.authorized) {
          setIsAuthorized(true);
          setRepositories(response.data.repositories || []);
        }
      } catch (err: any) {
        // Don't let a failure here log the user out - this is a non-critical check
        // A 401 here just means GitHub isn't connected, not that auth is expired
        console.warn("GitHub auth check failed (non-critical):", err?.response?.status);
        setIsAuthorized(false);
      }
    };
    checkAuth();
  }, []);

  const handleConnectGithub = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/integrations/github/url');
      const data = response.data;
      if (data.configured && data.installUrl) {
        // GitHub App exists — redirect to installation page
        window.location.href = data.installUrl;
      } else {
        // GitHub App NOT configured — show instructions
        setError('GitHub App is not configured yet. Please ask your admin to set up the GitHub App. Visit GitHub Settings > Developer settings > GitHub Apps to create one.');
        setIsLoading(false);
      }
    } catch (err: any) {
      // Even if the backend fails, redirect to GitHub directly
      setError('Could not connect to the server. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalUrl = '';
    if (repoType === 'public') {
      finalUrl = githubUrl;
    } else {
      finalUrl = selectedPrivateRepo;
    }

    if (!finalUrl.trim()) {
      setError('Please provide or select a GitHub repository.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const urls = [finalUrl];
      const response = await apiClient.post('/projects', { name, description, urls });
      const newProjectId = response.data.id;
      navigate(`/app/projects/${newProjectId}`);
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Failed to create project.');
      } else {
        setError('Failed to create project. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-background">
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/app/projects')}
              className="p-2 rounded-lg bg-surface-card border border-surface-border hover:bg-surface-background transition-colors text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Create New Project</h1>
              <p className="text-sm text-text-secondary mt-1">Connect your repository to start capturing knowledge.</p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <Card className="shadow-lg border-surface-border">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                <section>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Project Details</h3>
                  <div className="space-y-4">
                    <Input
                      label="Project Name"
                      placeholder="e.g. Payment Service"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-text-primary">
                        Description <span className="text-text-muted font-normal">(Optional)</span>
                      </label>
                      <textarea
                        className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-indigo transition-shadow min-h-[100px] resize-y"
                        placeholder="What does this project do?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                <hr className="border-surface-border" />

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                      GitHub Repository
                    </h3>
                    {isAuthorized && (
                      <span className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 size={16} /> Authorized
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mb-6">
                    Connect a repository to PRISM. Private repositories require you to authorize our GitHub App.
                  </p>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-text-primary mb-3">Repository Type</label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-text-primary">
                        <input type="radio" name="repoType" value="public" checked={repoType === 'public'} onChange={() => setRepoType('public')} className="text-primary-indigo focus:ring-primary-indigo w-4 h-4" />
                        <span className="text-sm">Public Repository</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-text-primary">
                        <input type="radio" name="repoType" value="private" checked={repoType === 'private'} onChange={() => setRepoType('private')} className="text-primary-indigo focus:ring-primary-indigo w-4 h-4" />
                        <span className="text-sm">Private Repository (Requires Auth)</span>
                      </label>
                    </div>
                  </div>

                  {repoType === 'public' ? (
                    <Input
                      placeholder="https://github.com/organization/repository"
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      required={repoType === 'public'}
                    />
                  ) : (
                    <div className="p-6 bg-surface-background/50 border border-surface-border rounded-lg">
                      {!isAuthorized ? (
                        <div className="text-center py-2">
                          <p className="text-sm text-text-secondary mb-4">You must authorize PRISM to select private repositories.</p>
                          <Button 
                            type="button" 
                            onClick={handleConnectGithub}
                            disabled={isLoading}
                            className="gap-2"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                            {isLoading ? 'Redirecting to GitHub...' : 'Authorize GitHub'}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-text-primary">Select Repository</label>
                          <select 
                            className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-indigo"
                            value={selectedPrivateRepo}
                            onChange={(e) => setSelectedPrivateRepo(e.target.value)}
                            required={repoType === 'private'}
                          >
                            <option value="" disabled>Select a private repository...</option>
                            {repositories.length === 0 ? (
                                <option value="" disabled>No repositories found</option>
                            ) : (
                                repositories.map((repo: any) => (
                                    <option key={repo.id} value={repo.html_url}>{repo.full_name}</option>
                                ))
                            )}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <div className="pt-6 flex items-center justify-end gap-3 border-t border-surface-border">
                  <Button type="button" variant="outline" onClick={() => navigate('/app/projects')}>
                    Cancel
                  </Button>
                  <Button type="submit" className="shadow-lg shadow-primary-indigo/20 px-8" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};
