import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams, Navigate, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  History, 
  GitBranch,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { cn } from '../../../utils/cn';

const projectTabs = [
  { label: 'Overview', path: 'overview', icon: LayoutDashboard },
  { label: 'Knowledge', path: 'knowledge', icon: BookOpen },
  { label: 'History', path: 'history', icon: History }
];

const syncStatusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  Synced: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Synced' },
  Syncing: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Syncing' },
  Failed: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Failed' },
  Pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pending' },
};

export const ProjectLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchProject = async () => {
    try {
      const response = await apiClient.get(`/projects/${id}`);
      setProject(response.data);
      setEditName(response.data.name);
      setEditDesc(response.data.description || '');
    } catch (error) {
      console.error('Failed to fetch project details', error);
      navigate('/app/overview', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id, navigate]);

  const handleSaveEdit = async () => {
    try {
      await apiClient.put(`/projects/${id}`, { name: editName, description: editDesc });
      setIsEditing(false);
      fetchProject(); // refresh data
    } catch (err) {
      console.error("Failed to update project", err);
      alert("Failed to update project.");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      try {
        await apiClient.delete(`/projects/${id}`);
        navigate('/app/overview', { replace: true });
      } catch (err) {
        console.error("Failed to delete project", err);
        alert("Failed to delete project. You must be the owner to delete it.");
      }
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-text-muted">Loading project...</div>;
  }

  if (!project) {
    return <Navigate to="/app/overview" replace />;
  }

  // Fallback to Synced if status isn't returned from API yet
  const syncInfo = syncStatusConfig[project.syncStatus || 'Synced'] || syncStatusConfig.Pending;
  const SyncIcon = syncInfo.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Project Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border-b border-surface-border bg-surface-card px-6 pt-5 pb-0"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 mr-4">
            {isEditing ? (
              <div className="space-y-2">
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  className="w-full text-2xl font-bold bg-surface-background border border-surface-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-indigo"
                  placeholder="Project Name"
                />
                <input 
                  type="text" 
                  value={editDesc} 
                  onChange={e => setEditDesc(e.target.value)} 
                  className="w-full text-sm text-text-secondary bg-surface-background border border-surface-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-indigo"
                  placeholder="Project Description"
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="text-xs px-3 py-1 bg-primary-indigo text-white rounded hover:bg-primary-dark-indigo">Save</button>
                  <button onClick={() => { setIsEditing(false); setEditName(project.name); setEditDesc(project.description || ''); }} className="text-xs px-3 py-1 bg-surface-background border border-surface-border text-text-secondary rounded hover:text-text-primary">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="group relative">
                <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
                <p className="text-sm text-text-secondary mt-1">{project.description}</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {!isEditing && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                <button onClick={() => setIsEditing(true)} className="p-1.5 text-text-muted hover:text-primary-indigo hover:bg-primary-light-indigo/30 rounded-md transition-colors" title="Edit Project">
                  <Edit2 size={16} />
                </button>
                <button onClick={handleDelete} className="p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Project">
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium", syncInfo.bg, syncInfo.color)}>
              <SyncIcon size={14} className={project.syncStatus === 'Syncing' ? 'animate-spin' : ''} />
              {syncInfo.label}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex gap-1 -mb-px">
          {projectTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all duration-200",
                  isActive
                    ? "border-primary-indigo text-primary-indigo bg-primary-light-indigo/30"
                    : "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-background"
                )
              }
            >
              <tab.icon size={16} />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </motion.div>

      {/* Tab Content */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex-1 overflow-y-auto"
      >
        <Outlet context={{ project }} />
      </motion.div>
    </div>
  );
};
