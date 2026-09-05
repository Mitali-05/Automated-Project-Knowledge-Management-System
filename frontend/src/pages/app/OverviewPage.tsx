import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { motion } from 'framer-motion';
import {
  FolderGit2, Users, BookOpen, TrendingUp, Download,
  ArrowUpRight, Clock, Mail, Building2, PlusCircle, GitBranch
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../../components/ui/Skeleton';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// ── Stat Card ───────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: string | number; change: string; icon: React.ElementType; color: string; delay: number }> = ({ label, value, change, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${color}15` }}>
            <Icon size={20} style={{ color }} />
          </div>
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <TrendingUp size={10} /> {change}
          </span>
        </div>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
      </CardContent>
    </Card>
  </motion.div>
);

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

// ── Main Overview ──────────────────────────────────────────
export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [projRes, statsRes] = await Promise.all([
          apiClient.get('/projects'),
          apiClient.get('/dashboard/stats')
        ]);
        setProjects(projRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="flex flex-col h-full bg-surface-background relative overflow-hidden">
      {/* Subtle Glow Effects */}
      <div className="absolute top-[-20%] left-[20%] w-[40%] h-[40%] bg-primary-indigo/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary-violet/10 blur-[120px] rounded-full pointer-events-none" />

      <main className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header - Profile Overview */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-indigo to-primary-violet flex items-center justify-center text-white text-3xl font-bold shadow-xl">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-text-primary">
                  Welcome back, {firstName}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} className="text-primary-indigo" />
                    {user?.email || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-primary-indigo" />
                    {user?.organizationName || 'Personal'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Dashboard Content */}
          <div className="space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {loading ? (
                  <>
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                  </>
                ) : (
                  <>
                    <StatCard label="Total Projects" value={stats?.totalProjects || 0} change="Live" icon={FolderGit2} color="#6366f1" delay={0.1} />
                    <StatCard label="Connected Repositories" value={stats?.totalRepositories || 0} change="Syncing" icon={GitBranch} color="#8b5cf6" delay={0.15} />
                    <StatCard label="Downloaded Reports" value={stats?.downloadsCount || 0} change="Reports" icon={Download} color="#10b981" delay={0.2} />
                  </>
                )}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="lg:col-span-2"
                >
                  <Card className="hover:shadow-lg transition-shadow duration-300 h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-semibold text-text-primary">Contribution Trends</h3>
                          <p className="text-xs text-text-muted mt-1">Knowledge extracted over time</p>
                        </div>
                      </div>
                      {loading ? (
                        <Skeleton className="h-[280px] w-full rounded-lg" />
                      ) : stats?.contributionTrends && stats.contributionTrends.length > 0 ? (
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.contributionTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorTrends" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -1px rgb(0 0 0 / 0.12)', padding: '12px 16px' }}
                                itemStyle={{ color: '#111827', fontWeight: 600, fontSize: '13px' }}
                                labelStyle={{ color: '#6b7280', marginBottom: '4px', fontSize: '12px' }}
                              />
                              <Line type="monotone" dataKey="total" name="Total Knowledge" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                              <Line type="monotone" dataKey="items" name="New Items" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[280px] bg-surface-background/50 rounded-lg border border-dashed border-surface-border">
                          <div className="text-center p-4">
                            <TrendingUp className="mx-auto h-8 w-8 text-text-muted mb-3" />
                            <p className="text-text-primary font-semibold mb-1">No contributions yet</p>
                            <p className="text-text-muted text-sm max-w-xs mx-auto mb-4">Create a project and connect a repository to start seeing contribution trends.</p>
                            <button onClick={() => navigate('/app/projects/new')} className="text-xs px-4 py-2 bg-primary-indigo text-white rounded-lg hover:bg-primary-violet transition-colors">
                              Create Project
                            </button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                >
                  <Card className="hover:shadow-lg transition-shadow duration-300 h-full">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-text-primary mb-1">Knowledge Distribution</h3>
                      <p className="text-xs text-text-muted mb-6">By category</p>
                      {loading ? (
                        <div className="flex justify-center items-center h-[280px]">
                          <Skeleton className="h-[200px] w-[200px] rounded-full" />
                        </div>
                      ) : stats?.knowledgeDistribution && stats.knowledgeDistribution.length > 0 ? (
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={stats.knowledgeDistribution}
                                cx="50%"
                                cy="45%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {stats.knowledgeDistribution.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: '#111827', fontWeight: 600 }}
                              />
                              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[280px] bg-surface-background/50 rounded-lg border border-dashed border-surface-border">
                          <div className="text-center p-4">
                            <BookOpen className="mx-auto h-8 w-8 text-text-muted mb-3" />
                            <p className="text-text-primary font-semibold mb-1">No Distribution</p>
                            <p className="text-text-muted text-sm max-w-xs mx-auto mb-4">You don't have any knowledge. Create a project to see distribution.</p>
                            <button onClick={() => navigate('/app/projects/new')} className="text-xs px-4 py-2 bg-primary-indigo text-white rounded-lg hover:bg-primary-violet transition-colors">
                              Create Project
                            </button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Your Projects (Quick View) */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="lg:col-span-5"
                >
                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-semibold text-text-primary">Recent Projects</h3>
                        <button
                          onClick={() => navigate('/app/projects')}
                          className="text-xs font-medium text-primary-indigo hover:text-primary-violet transition-colors flex items-center gap-1"
                        >
                          View All <ArrowUpRight size={12} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {loading ? (
                          <>
                            <Skeleton className="h-16 w-full rounded-xl" />
                            <Skeleton className="h-16 w-full rounded-xl" />
                          </>
                        ) : projects.length === 0 ? (
                          <div className="py-8 text-center bg-surface-background/50 rounded-lg border border-dashed border-surface-border">
                            <p className="text-text-primary font-semibold mb-2">No projects yet</p>
                            <p className="text-text-muted text-sm mb-4">Start by creating your first PRISM project.</p>
                            <button onClick={() => navigate('/app/projects/new')} className="text-sm px-4 py-2 bg-primary-indigo text-white rounded-lg hover:bg-primary-violet transition-colors flex items-center gap-2 mx-auto">
                              <PlusCircle size={16} /> Create Your First Project
                            </button>
                          </div>
                        ) : projects.slice(0, 5).map((project: any, i: number) => (
                          <motion.div
                            key={project.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + i * 0.05 }}
                            onClick={() => navigate(`/app/projects/${project.id}`)}
                            className="flex items-center gap-4 p-3.5 rounded-xl border border-surface-border hover:border-primary-indigo/30 hover:bg-primary-indigo/[0.02] transition-all cursor-pointer group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-indigo to-primary-violet flex items-center justify-center text-white font-bold text-sm shadow-md">
                              {project.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-text-primary group-hover:text-primary-indigo transition-colors truncate">{project.name}</p>
                              <p className="text-xs text-text-muted truncate">{project.description || 'No description provided'}</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-4 text-xs text-text-muted">
                              <span className="flex items-center gap-1"><Users size={12} /> {project.role || 'Member'}</span>
                              <span className="flex items-center gap-1"><Clock size={12} /> {new Date(project.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
          </div>
        </div>
      </main>
    </div>
  );
};
