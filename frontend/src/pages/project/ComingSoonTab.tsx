import { Sparkles } from 'lucide-react'
import { EmptyState } from '../../components/ui/States'

export default function ComingSoonTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <EmptyState icon={<Sparkles size={32} />} title="Coming soon" description={description} />
    </div>
  )
}
