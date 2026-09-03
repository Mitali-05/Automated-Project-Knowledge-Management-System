import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, X, FolderGit2, Link as LinkIcon, AlertCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const CreateProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [links, setLinks] = useState([{ name: 'GitHub', url: '' }]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddLink = () => {
    setLinks([...links, { name: '', url: '' }]);
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = [...links];
    newLinks.splice(index, 1);
    setLinks(newLinks);
  };

  const handleLinkChange = (index: number, field: 'name' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // MOCK: simulate project creation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generate a mock project id
      const newProjectId = 'p-' + Date.now();
      
      // Store the new project in localStorage for demo
      const existingProjects = JSON.parse(localStorage.getItem('mock_projects') || '[]');
      existingProjects.push({
        id: newProjectId,
        name,
        description,
        links: links.filter(l => l.url),
        createdAt: new Date().toISOString(),
        status: 'active'
      });
      localStorage.setItem('mock_projects', JSON.stringify(existingProjects));
      
      navigate(`/app/projects/${newProjectId}`);
    } catch (err: any) {
      setError('Failed to create project. Please try again.');
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
              onClick={() => navigate('/app/overview')}
              className="p-2 rounded-lg bg-surface-card border border-surface-border hover:bg-surface-background transition-colors text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Create New Project</h1>
              <p className="text-sm text-text-secondary mt-1">Connect your repositories and trackers to start capturing knowledge.</p>
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
                  <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <FolderGit2 size={18} className="text-primary-indigo" />
                    Project Details
                  </h3>
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
                      <LinkIcon size={18} className="text-primary-indigo" />
                      Connected Sources
                    </h3>
                  </div>
                  <p className="text-sm text-text-secondary mb-6">
                    Add links to GitHub repositories, Jira boards, or Claude projects. We'll automatically ingest knowledge from these sources.
                  </p>

                  <div className="space-y-4">
                    {links.map((link, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-start gap-3"
                      >
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Input
                            placeholder="Source (e.g. GitHub)"
                            value={link.name}
                            onChange={(e) => handleLinkChange(index, 'name', e.target.value)}
                            required
                          />
                          <div className="sm:col-span-2">
                            <Input
                              placeholder="URL (e.g. https://github.com/...)"
                              type="url"
                              value={link.url}
                              onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        {links.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLink(index)}
                            className="mt-1 p-2.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddLink}
                    className="mt-4 gap-2 border-dashed"
                  >
                    <Plus size={16} /> Add Link
                  </Button>
                </section>

                <div className="pt-6 flex items-center justify-end gap-3 border-t border-surface-border">
                  <Button type="button" variant="outline" onClick={() => navigate('/app/overview')}>
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
