import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Dashboard } from '../../api/types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

const HEALTH = [
  { key: 'fresh', name: 'Fresh', color: '#10B981', hint: 'updated in the last 30 days' },
  { key: 'stale', name: 'Stale', color: '#F59E0B', hint: '30 to 90 days old' },
  { key: 'outdated', name: 'Outdated', color: '#EF4444', hint: 'older than 90 days' },
] as const

export function HealthChart({ health }: { health: Dashboard['health'] }) {
  const total = health.fresh + health.stale + health.outdated
  const data = HEALTH.map((h) => ({ ...h, value: health[h.key] }))
  return (
    <Card className="h-full min-w-0 overflow-hidden">
      <CardHeader><CardTitle>Knowledge health</CardTitle></CardHeader>
      <CardContent className="min-w-0">
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">Health appears here once knowledge has been extracted.</p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
            <div className="relative h-36 w-36 sm:h-40 sm:w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.filter((d) => d.value > 0)} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="none">
                    {data.filter((d) => d.value > 0).map((d) => <Cell key={d.key} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl sm:text-2xl font-bold">{total}</span>
                <span className="text-[11px] text-text-muted">items</span>
              </div>
            </div>
            <ul className="w-full min-w-0 space-y-2 text-xs sm:text-sm">
              {data.map((d) => (
                <li key={d.key} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} aria-hidden />
                  <span className="font-medium shrink-0">{d.name}</span>
                  <span className="text-[11px] sm:text-xs text-text-muted truncate min-w-0 flex-1">{d.hint}</span>
                  <span className="ml-auto font-semibold shrink-0">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function TypeChart({ rows }: { rows: Dashboard['knowledgeByType'] }) {
  const data = rows.slice(0, 8).map((r) => ({ name: r.type.replace(/_/g, ' '), count: r.count }))
  return (
    <Card className="h-full min-w-0 overflow-hidden">
      <CardHeader><CardTitle>Knowledge by type</CardTitle></CardHeader>
      <CardContent className="min-w-0">
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">No knowledge extracted yet.</p>
        ) : (
          <div className="w-full min-w-0" style={{ height: Math.max(140, data.length * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: '#4B5563' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#EEF2FF' }} />
                <Bar dataKey="count" name="Items" fill="#4F46E5" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
