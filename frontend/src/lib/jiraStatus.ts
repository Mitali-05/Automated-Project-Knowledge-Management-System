/** One grouping rule for metrics, filters, board columns and issue details. */
export function jiraStatusGroup(status: string | null | undefined): 'To Do' | 'In Progress' | 'Done' {
  const text = (status ?? '').trim().toLowerCase()
  if (/\b(done|resolved|closed|completed)\b/.test(text)) return 'Done'
  if (/\b(progress|review|testing|validation)\b/.test(text)) return 'In Progress'
  return 'To Do'
}
