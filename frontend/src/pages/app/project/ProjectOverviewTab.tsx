import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  GitBranch, 
  ArrowRight,
  RefreshCw,
  Cpu,
  Database,
  Box,
  Layers,
  Settings,
  Zap,
  AlertTriangle,
  Link2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Project } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle, AnimatedCard } from '../../../components/ui/Card';
import { apiClient } from '../../../api/client';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

// Map knowledge types to icons and colors
const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  'MODULE_RESPONSIBILITY': { icon: Box, color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', label: 'Module' },
  'TECHNICAL_DECISION': { icon: Zap, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Decision' },
  'IMPLEMENTATION_DETAIL': { icon: Cpu, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', label: 'Implementation' },
  'CONFIGURATION': { icon: Settings, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'Config' },
  'PROBLEM_RESOLUTION': { icon: AlertTriangle, color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Resolution' },
  'DEPENDENCY': { icon: Link2, color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', label: 'Dependency' },
};

const getTypeConfig = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG['IMPLEMENTATION_DETAIL'];

// Architecture node component
const ArchNode: React.FC<{ item: any; index: number; isExpanded: boolean; onToggle: () => void }> = ({ item, index, isExpanded, onToggle }) => {
  const config = getTypeConfig(item.knowledgeType || item.type);
  const Icon = config.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
      className="group"
    >
      <div 
        className="relative rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg"
        style={{ 
          borderColor: config.border, 
          backgroundColor: config.bg,
        }}
        onClick={onToggle}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: config.color + '15', border: `1px solid ${config.border}` }}
            >
              <Icon size={18} style={{ color: config.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span 
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ color: config.color, backgroundColor: config.color + '15' }}
                >
                  {config.label}
                </span>
                {item.confidence && (
                  <span className="text-[10px] text-text-muted">
                    {Math.round(item.confidence * 100)}% conf
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-text-primary leading-tight line-clamp-2">
                {item.title}
              </h4>
              {item.module && (
                <p className="text-[11px] text-text-muted mt-1 font-mono">
                  📁 {item.module}
                </p>
              )}
            </div>
            <button className="text-text-muted hover:text-text-primary transition-colors p-1">
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 border-t"
            style={{ borderColor: config.border }}
          >
            <p className="text-xs text-text-secondary mt-3 leading-relaxed">
              {item.summary || item.description}
            </p>
            {item.details && item.details !== item.summary && (
              <p className="text-xs text-text-muted mt-2 leading-relaxed italic">
                {item.details.length > 300 ? item.details.substring(0, 300) + '...' : item.details}
              </p>
            )}
            {item.evidenceIds && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.evidenceIds.split(',').slice(0, 3).map((eid: string, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-surface-background text-text-muted border border-surface-border font-mono">
                    {eid.trim()}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export const ProjectOverviewTab: React.FC = () => {
  const { project } = useOutletContext<{ project: Project }>();
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        const response = await apiClient.get(`/projects/${project.id}/knowledge`);
        setKnowledge(response.data);
      } catch (err) {
        console.error("Failed to fetch knowledge", err);
      } finally {
        setLoading(false);
      }
    };
    fetchKnowledge();
  }, [project.id]);

  const stats = [
    { label: 'Knowledge Extracted', value: knowledge.length, icon: BookOpen, color: 'text-primary-blue', bg: 'bg-primary-light-blue' },
    { label: 'Contributors', value: project.contributors?.length || 1, icon: Users, color: 'text-primary-indigo', bg: 'bg-primary-light-indigo' },
    { label: 'Repositories', value: project.repositories?.length || 0, icon: GitBranch, color: 'text-primary-violet', bg: 'bg-primary-light-violet' },
  ];

  // Group knowledge by type
  const typeGroups = knowledge.reduce((acc, item) => {
    const type = item.knowledgeType || item.type || 'UNKNOWN';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const typeEntries = Object.entries(typeGroups).sort((a, b) => b[1].length - a[1].length);
  
  const filteredKnowledge = selectedType 
    ? knowledge.filter(k => (k.knowledgeType || k.type) === selectedType)
    : knowledge;

  // Group by module for architecture view
  const moduleGroups = filteredKnowledge.reduce((acc, item) => {
    const module = item.module || 'General';
    if (!acc[module]) acc[module] = [];
    acc[module].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 md:p-8 max-w-7xl mx-auto space-y-8"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <AnimatedCard className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-text-primary">{loading ? '-' : stat.value}</p>
                <p className="text-sm text-text-secondary font-medium">{stat.label}</p>
              </div>
            </AnimatedCard>
          </motion.div>
        ))}
      </div>

      {/* Knowledge Generation Pipeline */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-primary-indigo/5 via-primary-violet/5 to-surface-background border-primary-indigo/10">
          <CardHeader>
            <CardTitle className="text-base text-primary-indigo flex items-center gap-2">
              <RefreshCw size={18} />
              Knowledge Generation Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4">
              <div className="flex flex-col items-center text-center p-4 bg-surface-background rounded-xl border border-surface-border w-full md:w-1/3">
                <GitBranch size={32} className="text-text-muted mb-2" />
                <h4 className="font-semibold text-text-primary">1. Source Integration</h4>
                <p className="text-xs text-text-muted mt-1">Ingests commits, PRs, and docs from public/private repositories.</p>
              </div>
              <ArrowRight className="hidden md:block text-primary-indigo/40" size={32} />
              <div className="flex flex-col items-center text-center p-4 bg-primary-indigo/5 border border-primary-indigo/20 rounded-xl w-full md:w-1/3 shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-indigo/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <Cpu size={32} className="text-primary-indigo mb-2" />
                <h4 className="font-semibold text-primary-indigo">2. AI Extraction Engine</h4>
                <p className="text-xs text-primary-indigo/70 mt-1">Identifies architectural decisions, risks, and technical debt.</p>
              </div>
              <ArrowRight className="hidden md:block text-primary-violet/40" size={32} />
              <div className="flex flex-col items-center text-center p-4 bg-surface-background rounded-xl border border-surface-border w-full md:w-1/3">
                <Database size={32} className="text-text-muted mb-2" />
                <h4 className="font-semibold text-text-primary">3. Knowledge Base</h4>
                <p className="text-xs text-text-muted mt-1">Structured semantic graph for querying and onboarding.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* System Architecture View */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers size={18} className="text-primary-indigo" />
                System Architecture
              </CardTitle>
              <span className="text-xs text-text-muted">
                {knowledge.length} items • {Object.keys(moduleGroups).length} modules
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-text-muted text-center py-12">Analyzing architecture...</div>
            ) : knowledge.length === 0 ? (
              <div className="text-sm text-text-muted text-center py-12">
                No architecture data available yet. Generate knowledge to see system architecture.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Type Filter Pills */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedType(null)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                      selectedType === null 
                        ? 'bg-primary-indigo text-white border-primary-indigo shadow-sm' 
                        : 'bg-surface-background text-text-secondary border-surface-border hover:border-primary-indigo/30'
                    }`}
                  >
                    All ({knowledge.length})
                  </button>
                  {typeEntries.map(([type, items]) => {
                    const config = getTypeConfig(type);
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(selectedType === type ? null : type)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all flex items-center gap-1.5 ${
                          selectedType === type 
                            ? 'shadow-sm' 
                            : 'hover:shadow-sm'
                        }`}
                        style={{
                          backgroundColor: selectedType === type ? config.color : config.bg,
                          color: selectedType === type ? '#fff' : config.color,
                          borderColor: selectedType === type ? config.color : config.border,
                        }}
                      >
                        <config.icon size={12} />
                        {config.label} ({items.length})
                      </button>
                    );
                  })}
                </div>

                {/* Architecture Graph - Grouped by Module */}
                <div className="space-y-6">
                  {Object.entries(moduleGroups).map(([moduleName, items], groupIdx) => (
                    <div key={moduleName} className="relative">
                      {/* Module Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-indigo to-primary-violet flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {moduleName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-text-primary">{moduleName}</h4>
                          <p className="text-[11px] text-text-muted">{(items as any[]).length} knowledge items</p>
                        </div>
                        {/* Connector line */}
                        {groupIdx < Object.keys(moduleGroups).length - 1 && (
                          <div className="flex-1 border-t border-dashed border-surface-border ml-2" />
                        )}
                      </div>

                      {/* Knowledge nodes in a grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-11">
                        {(items as any[]).map((item, idx) => (
                          <ArchNode 
                            key={item.id || idx} 
                            item={item} 
                            index={idx}
                            isExpanded={expandedId === (item.id || idx)}
                            onToggle={() => setExpandedId(expandedId === (item.id || idx) ? null : (item.id || idx))}
                          />
                        ))}
                      </div>

                      {/* Vertical connector between modules */}
                      {groupIdx < Object.keys(moduleGroups).length - 1 && (
                        <div className="flex justify-center my-4">
                          <div className="w-px h-6 bg-gradient-to-b from-primary-indigo/30 to-primary-violet/30" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};
