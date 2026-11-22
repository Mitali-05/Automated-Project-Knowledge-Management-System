import { Sparkles, Compass, ShieldAlert, Cpu, ArrowRight, Layers, HelpCircle, ShieldCheck } from 'lucide-react'

interface AssistantWelcomeProps {
  projectName: string
  onSelectQuestion: (question: string) => void
}

export function AssistantWelcome({ projectName, onSelectQuestion }: AssistantWelcomeProps) {
  const suggestions = [
    {
      icon: Compass,
      title: 'Architecture Overview',
      subtitle: 'Mode A: Project Intelligence',
      question: `Explain the overall architecture and core module design of ${projectName}.`,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      icon: Layers,
      title: 'Deep Project Analysis',
      subtitle: 'Comprehensive 10-part audit',
      question: 'Analyse this entire project and provide a complete technical breakdown.',
      color: 'text-violet-600 bg-violet-50 border-violet-100',
    },
    {
      icon: Cpu,
      title: 'Developer Onboarding',
      subtitle: 'Mode C: Hybrid Synthesis',
      question: 'How much time would a junior developer require to understand this project?',
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      icon: ShieldAlert,
      title: 'Drift & Freshness Status',
      subtitle: 'Commit Drift Monitoring',
      question: 'Which knowledge items are potentially stale or affected by recent repository changes?',
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      icon: HelpCircle,
      title: 'General SWE Intelligence',
      subtitle: 'Mode B: Conversational AI',
      question: 'What is the difference between REST and GraphQL APIs?',
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      icon: ShieldCheck,
      title: 'Security & Posture Review',
      subtitle: 'Mode C: Hybrid Synthesis',
      question: 'Evaluate this project’s security architecture and potential vulnerabilities.',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center py-4 sm:py-8 px-2 sm:px-4 text-center max-w-4xl mx-auto">
      <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 mb-3 sm:mb-4 ring-4 ring-indigo-50">
        <Sparkles size={26} className="sm:w-[30px] sm:h-[30px]" aria-hidden />
      </div>

      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
        Ask PRISM Assistant
      </h2>
      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-text-secondary max-w-xl leading-relaxed">
        Autonomous hybrid intelligence for <span className="font-semibold text-text-primary">{projectName}</span>. Combines verified, citation-backed repository knowledge with principal engineering intelligence.
      </p>

      <div className="mt-6 sm:mt-8 grid w-full grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 text-left">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectQuestion(s.question)}
            className="group flex flex-col justify-between rounded-2xl border border-surface-border bg-surface-card p-3.5 sm:p-4 transition-all duration-200 hover:border-primary-indigo/50 hover:shadow-md cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${s.color}`}>
                  <s.icon size={16} aria-hidden />
                </span>
                <ArrowRight size={14} className="text-text-muted opacity-80 sm:opacity-0 sm:group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary group-hover:text-primary-indigo transition-colors">
                {s.title}
              </h3>
              <p className="text-[10px] font-semibold text-primary-indigo/80 uppercase tracking-wider mt-0.5">
                {s.subtitle}
              </p>
              <p className="mt-1.5 text-xs text-text-muted line-clamp-2 leading-relaxed">
                {s.question}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
