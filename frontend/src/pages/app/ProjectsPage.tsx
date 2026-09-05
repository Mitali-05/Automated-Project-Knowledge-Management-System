import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FolderGit2, Plus, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '../../components/ui/Skeleton';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await apiClient.get('/projects');
        setProjects(response.data);
      } catch (error) {
        console.error('Failed to fetch projects', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface-background relative overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Projects</h1>
              <p className="text-text-secondary mt-1">Manage your team's knowledge repositories.</p>
            </div>
            <Button onClick={() => navigate('/app/projects/new')} className="gap-2 shadow-lg shadow-primary-indigo/20">
              <Plus size={18} /> New Project
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[200px] w-full rounded-2xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-surface-card/50 border border-surface-border rounded-3xl backdrop-blur-md">
              <div className="w-20 h-20 bg-primary-indigo/10 text-primary-indigo rounded-full flex items-center justify-center mb-6">
                <FolderGit2 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">No projects yet</h2>
              <p className="text-text-secondary mb-8 max-w-md">
                Get started by creating your first project and extracting knowledge from your GitHub repositories.
              </p>
              <Button onClick={() => navigate('/app/projects/new')} className="px-8 py-3">
                Create First Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card 
                    className="hover:shadow-xl transition-all duration-300 cursor-pointer h-full border-surface-border hover:border-primary-indigo/40 group"
                    onClick={() => navigate(`/app/projects/${project.id}`)}
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-indigo to-primary-violet flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium bg-green-50 text-green-600 px-2 py-1 rounded-full flex items-center gap-1 border border-green-100">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Active
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-primary-indigo transition-colors line-clamp-1">{project.name}</h3>
                      <p className="text-sm text-text-secondary mb-6 line-clamp-2 flex-1">
                        {project.description || "No description provided for this project."}
                      </p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-surface-border mt-auto">
                        <div className="flex items-center gap-4 text-xs text-text-muted">
                          <span className="flex items-center gap-1.5">
                            <Users size={14} className="text-primary-indigo" />
                            {project.role}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} className="text-primary-indigo" />
                            {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
