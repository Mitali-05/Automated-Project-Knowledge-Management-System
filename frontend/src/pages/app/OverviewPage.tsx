import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderGit2, GitCommit, Users, BookOpen, TrendingUp,
  Plus, ArrowUpRight, Clock, Zap
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ── Dummy Data ──────────────────────────────────────────────
const contributionData = [
  { month: 'Jan', commits: 32, reviews: 18, docs: 5 },
  { month: 'Feb', commits: 45, reviews: 22, docs: 8 },
  { month: 'Mar', commits: 28, reviews: 30, docs: 12 },
  { month: 'Apr', commits: 60, reviews: 25, docs: 9 },
  { month: 'May', commits: 52, reviews: 35, docs: 15 },
  { month: 'Jun', commits: 70, reviews: 40, docs: 11 },
  { month: 'Jul', commits: 48, reviews: 28, docs: 18 },
];

const knowledgeByCategory = [
  { name: 'Architecture', value: 35, color: '#6366f1' },
  { name: 'API Docs', value: 25, color: '#3b82f6' },
  { name: 'Onboarding', value: 20, color: '#8b5cf6' },
  { name: 'Debugging', value: 12, color: '#06b6d4' },
  { name: 'Best Practices', value: 8, color: '#10b981' },
];

const weeklyActivity = [
  { day: 'Mon', knowledge: 12, gaps: 3 },
  { day: 'Tue', knowledge: 18, gaps: 5 },
  { day: 'Wed', knowledge: 15, gaps: 2 },
  { day: 'Thu', knowledge: 22, gaps: 4 },
  { day: 'Fri', knowledge: 30, gaps: 6 },
  { day: 'Sat', knowledge: 8, gaps: 1 },
  { day: 'Sun', knowledge: 5, gaps: 0 },
];

const dummyProjects = [
  { id: 'p-1', name: 'Payment Service', description: 'Core payment processing microservice', status: 'active', contributors: 8, knowledgeItems: 124, lastSync: '2 hours ago' },
  { id: 'p-2', name: 'User Auth Module', description: 'Authentication and authorization service', status: 'active', contributors: 5, knowledgeItems: 87, lastSync: '30 min ago' },
  { id: 'p-3', name: 'Dashboard UI', description: 'React frontend for analytics dashboard', status: 'syncing', contributors: 12, knowledgeItems: 203, lastSync: '5 min ago' },
  { id: 'p-4', name: 'ML Pipeline', description: 'Machine learning data processing pipeline', status: 'active', contributors: 6, knowledgeItems: 56, lastSync: '1 day ago' },
];

const recentActivity = [
  { id: 1, type: 'knowledge', message: 'New architecture doc extracted from Payment Service', time: '5 min ago', icon: BookOpen },
  { id: 2, type: 'commit', message: 'PR #142 merged: Refactor auth middleware', time: '15 min ago', icon: GitCommit },
  { id: 3, type: 'gap', message: 'Knowledge gap detected in ML Pipeline deployment docs', time: '1 hour ago', icon: Zap },
  { id: 4, type: 'knowledge', message: 'API documentation updated for User Auth Module', time: '2 hours ago', icon: BookOpen },
  { id: 5, type: 'commit', message: 'PR #87 merged: Add rate limiting to Dashboard UI', time: '3 hours ago', icon: GitCommit },
];

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

// ── Custom Tooltip ──────────────────────────────────────────
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-surface-border">
        <p className="text-sm font-semibold text-text-primary mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ── Main Dashboard ──────────────────────────────────────────
export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="flex flex-col h-full bg-surface-background">
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold text-text-primary">
                Welcome back, {firstName} 👋
              </h1>
              <p className="text-text-secondary mt-1">Here's what's happening across your projects today.</p>
            </div>
            <Button onClick={() => navigate('/app/projects/new')} className="gap-2 shadow-lg shadow-primary-indigo/20">
              <Plus size={18} /> New Project
            </Button>
          </motion.div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Projects" value={dummyProjects.length} change="+2 this month" icon={FolderGit2} color="#6366f1" delay={0.1} />
            <StatCard label="Knowledge Items" value="470" change="+34 this week" icon={BookOpen} color="#3b82f6" delay={0.15} />
            <StatCard label="Contributions" value="285" change="+12% vs last month" icon={GitCommit} color="#8b5cf6" delay={0.2} />
            <StatCard label="Team Members" value="31" change="+3 new" icon={Users} color="#06b6d4" delay={0.25} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Contribution Trends - Area Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="lg:col-span-2"
            >
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">Contribution Trends</h3>
                      <p className="text-xs text-text-muted mt-1">Commits, reviews & docs over time</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={contributionData}>
                      <defs>
                        <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="commits" stroke="#6366f1" fill="url(#colorCommits)" strokeWidth={2} name="Commits" />
                      <Area type="monotone" dataKey="reviews" stroke="#3b82f6" fill="url(#colorReviews)" strokeWidth={2} name="Reviews" />
                      <Area type="monotone" dataKey="docs" stroke="#8b5cf6" fill="url(#colorDocs)" strokeWidth={2} name="Docs" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Knowledge Distribution - Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <Card className="hover:shadow-lg transition-shadow duration-300 h-full">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-1">Knowledge Distribution</h3>
                  <p className="text-xs text-text-muted mb-4">By category</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={knowledgeByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {knowledgeByCategory.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {knowledgeByCategory.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-text-secondary">{item.name}</span>
                        </div>
                        <span className="font-medium text-text-primary">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Weekly Activity Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Weekly Activity</h3>
                    <p className="text-xs text-text-muted mt-1">Knowledge items captured vs gaps identified</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyActivity} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="knowledge" fill="#6366f1" radius={[6, 6, 0, 0]} name="Knowledge Captured" />
                    <Bar dataKey="gaps" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Gaps Identified" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Projects + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Projects List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="lg:col-span-3"
            >
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-text-primary">Your Projects</h3>
                    <button
                      onClick={() => navigate('/app/projects/new')}
                      className="text-xs font-medium text-primary-indigo hover:text-primary-violet transition-colors flex items-center gap-1"
                    >
                      View All <ArrowUpRight size={12} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {dummyProjects.map((project, i) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.05 }}
                        onClick={() => navigate(`/app/projects/${project.id}`)}
                        className="flex items-center gap-4 p-3.5 rounded-xl border border-surface-border hover:border-primary-indigo/30 hover:bg-primary-indigo/[0.02] transition-all cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-indigo to-primary-violet flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {project.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary group-hover:text-primary-indigo transition-colors truncate">{project.name}</p>
                          <p className="text-xs text-text-muted truncate">{project.description}</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 text-xs text-text-muted">
                          <span className="flex items-center gap-1"><Users size={12} /> {project.contributors}</span>
                          <span className="flex items-center gap-1"><BookOpen size={12} /> {project.knowledgeItems}</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {project.lastSync}</span>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${project.status === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="lg:col-span-2"
            >
              <Card className="hover:shadow-lg transition-shadow duration-300 h-full">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-5">Recent Activity</h3>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => {
                      const Icon = activity.icon;
                      return (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            activity.type === 'knowledge' ? 'bg-blue-50 text-blue-500' :
                            activity.type === 'commit' ? 'bg-green-50 text-green-500' :
                            'bg-amber-50 text-amber-500'
                          }`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-primary leading-snug">{activity.message}</p>
                            <p className="text-[10px] text-text-muted mt-1">{activity.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};
