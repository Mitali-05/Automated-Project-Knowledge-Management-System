import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../../api/client';
import { 
  Search, 
  Filter, 
  X, 
  ExternalLink,
  ChevronRight,
  BookOpen,
  Lightbulb,
  Cog,
  Workflow,
  AlertTriangle
} from 'lucide-react';
import type { Project, KnowledgeItem } from '../../../types';
import { Card, CardContent, AnimatedCard } from '../../../components/ui/Card';

const typeIcons: Record<string, React.ElementType> = {
  'Technical Decision': Lightbulb,
  'Architecture': BookOpen,
  'Process': Workflow,
  'Configuration': Cog,
  'Troubleshooting': AlertTriangle,
};

const typeColors: Record<string, { text: string; bg: string }> = {
  'Technical Decision': { text: 'text-blue-700', bg: 'bg-blue-100' },
  'Architecture': { text: 'text-violet-700', bg: 'bg-violet-100' },
  'Process': { text: 'text-emerald-700', bg: 'bg-emerald-100' },
  'Configuration': { text: 'text-amber-700', bg: 'bg-amber-100' },
  'Troubleshooting': { text: 'text-red-700', bg: 'bg-red-100' },
};

const freshnessColors: Record<string, { text: string; bg: string; dot: string }> = {
  Fresh: { text: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  Stale: { text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  Outdated: { text: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
};

export const ProjectKnowledgeTab: React.FC = () => {
  const { project } = useOutletContext<{ project: Project }>();
  const [allKnowledge, setAllKnowledge] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/projects/${project.id}/knowledge`);
        setAllKnowledge(response.data);
      } catch (err) {
        setError('Failed to fetch extracted knowledge from the backend.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchKnowledge();
  }, [project.id]);

  const types = ['All', ...Array.from(new Set(allKnowledge.map(k => k.type)))];

  const filteredKnowledge = allKnowledge.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.module.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || item.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex h-full">
      {/* Knowledge List */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex-1 flex gap-3 w-full">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search knowledge items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-surface-border bg-surface-card pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-indigo transition-shadow"
                />
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {types.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1.5 h-10 rounded-lg text-xs font-medium transition-all ${
                      selectedType === type
                        ? 'bg-primary-indigo text-white shadow-sm'
                        : 'bg-surface-card border border-surface-border text-text-secondary hover:bg-surface-background'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => {
                const headers = ['ID', 'Title', 'Type', 'Module', 'Confidence', 'Freshness', 'Summary'];
                const rows = allKnowledge.map(item => {
                  return [
                    item.id,
                    `"${item.title.replace(/"/g, '""')}"`,
                    `"${item.type}"`,
                    `"${item.module}"`,
                    item.confidence,
                    `"${item.freshness}"`,
                    `"${item.summary.replace(/"/g, '""')}"`
                  ].join(',');
                });
                const csvContent = [headers.join(','), ...rows].join('\n');
                const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", project.name + "_knowledge.csv");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
              }}
              className="h-10 px-4 rounded-lg bg-primary-indigo/10 text-primary-indigo hover:bg-primary-indigo hover:text-white transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap"
            >
              <BookOpen size={16} />
              Download KB
            </button>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-16 text-text-muted">
                <p className="text-sm">Loading extracted knowledge...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16 text-red-500">
                <p className="text-sm">{error}</p>
              </div>
            ) : (
            <>
            <AnimatePresence>
              {filteredKnowledge.map((item, idx) => {
                const typeColor = typeColors[item.type] || typeColors['Technical Decision'];
                const freshColor = freshnessColors[item.freshness] || freshnessColors.Fresh;
                const TypeIcon = typeIcons[item.type] || BookOpen;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <AnimatedCard 
                      className="p-5 cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`h-9 w-9 rounded-lg ${typeColor.bg} ${typeColor.text} flex items-center justify-center shrink-0 mt-0.5`}>
                            <TypeIcon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-text-primary mb-1 group-hover:text-primary-indigo">
                              {item.title}
                            </h3>
                            <p className="text-xs text-text-secondary line-clamp-2 mb-2">{item.preview}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeColor.bg} ${typeColor.text}`}>
                                {item.type}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${freshColor.bg} ${freshColor.text}`}>
                                <div className={`h-1.5 w-1.5 rounded-full ${freshColor.dot}`}></div>
                                {item.freshness}
                              </span>
                              <span className="text-xs text-text-muted">
                                {item.module} · {item.sources.length} source{item.sources.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-text-muted mt-1 shrink-0" />
                      </div>
                    </AnimatedCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredKnowledge.length === 0 && (
              <div className="text-center py-16 text-text-muted">
                <Search size={40} className="mx-auto mb-4 opacity-30" />
                <p className="text-sm">No knowledge items found matching your filters.</p>
              </div>
            )}
            </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Evidence Side Panel */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-[400px] border-l border-surface-border bg-surface-card overflow-y-auto shrink-0 shadow-xl"
          >
            <div className="sticky top-0 bg-surface-card border-b border-surface-border px-5 py-4 flex items-center justify-between z-10">
              <h3 className="font-semibold text-text-primary text-sm">Evidence & Details</h3>
              <button onClick={() => setSelectedItem(null)} className="p-1 rounded-md hover:bg-surface-background text-text-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <h4 className="text-base font-bold text-text-primary mb-2">{selectedItem.title}</h4>
                <p className="text-sm text-text-secondary leading-relaxed">{selectedItem.description}</p>
              </div>

              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Metadata</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-surface-background">
                    <p className="text-xs text-text-muted mb-1">Module</p>
                    <p className="text-sm font-medium text-text-primary">{selectedItem.module}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-background">
                    <p className="text-xs text-text-muted mb-1">Confidence</p>
                    <p className="text-sm font-medium text-text-primary">{selectedItem.confidence}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-background">
                    <p className="text-xs text-text-muted mb-1">Type</p>
                    <p className="text-sm font-medium text-text-primary">{selectedItem.type}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-background">
                    <p className="text-xs text-text-muted mb-1">Updated</p>
                    <p className="text-sm font-medium text-text-primary">{new Date(selectedItem.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Evidence Sources</h5>
                <div className="space-y-2">
                  {selectedItem.sources.map((source) => (
                    <a
                      key={source.id}
                      href={source.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-surface-border bg-surface-background hover:bg-primary-light-indigo/30 hover:border-primary-indigo/30 transition-all group"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary group-hover:text-primary-indigo transition-colors">{source.reference}</p>
                        <p className="text-xs text-text-muted">{source.type}</p>
                      </div>
                      <ExternalLink size={14} className="text-text-muted group-hover:text-primary-indigo transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
