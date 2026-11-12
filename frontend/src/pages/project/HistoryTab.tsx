import { History } from 'lucide-react'
import { useState } from 'react'
import { activityApi } from '../../api/endpoints'
import { ActivityList } from '../../components/ActivityList'
import { Button } from '../../components/ui/Button'
import { Card, CardContent } from '../../components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useProject } from '../../hooks/useProject'

export default function HistoryTab() {
  const { detail } = useProject()
  const [page, setPage] = useState(0)
  const { data, loading, error, reload } = useAsync(() => activityApi.list(detail.project.id, page), [detail.project.id, page])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">History</h2>
      {loading && !data && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.items.length === 0 && <EmptyState icon={<History size={32} />} title="No activity yet" description="Commits and pull requests will appear here after the first sync." />}
      {data && data.items.length > 0 && (
        <Card><CardContent className="p-6">
          <ActivityList items={data.items} />
          <div className="mt-6 flex items-center justify-between border-t border-surface-border pt-4 text-sm text-text-muted">
            <span>Page {data.page + 1} of {Math.max(1, data.totalPages)} · {data.totalItems} events</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= data.totalPages || loading} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}
