import { useEffect, useId, useState } from 'react'
import { Skeleton } from '../ui/Skeleton'

function clean(code: string): string {
  return code
    .trim()
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .split('\n')
    .filter((l) => !l.trim().startsWith('```'))
    .join('\n')
    .trim()
}

function repair(src: string): string {
  if (!/^\s*(graph|flowchart)\b/m.test(src)) return src
  const q = (t: string) => `"${t.replace(/"/g, "'")}"`
  const special = /[()[\]{}:;,&<>#/]/
  return src
    .split('\n')
    .map((line) =>
      line
        .replace(/\|([^|"\n]+)\|/g, (m, t: string) => (special.test(t) ? `|${q(t)}|` : m))
        .replace(/(\b[\w.-]+)\[(?![[("/\\])([^\]\n"]+)\]/g, (m, id: string, t: string) => (special.test(t) ? `${id}[${q(t)}]` : m))
        .replace(/(\b[\w.-]+)\{(?![{"])([^}\n"]+)\}/g, (m, id: string, t: string) => (/[()[\]:;,&<>#/]/.test(t) ? `${id}{${q(t)}}` : m)),
    )
    .join('\n')
}

export function MermaidDiagram({ code, title }: { code: string; title: string }) {
  const rawId = useId()
  const [svg, setSvg] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const source = clean(code)

  useEffect(() => {
    let cancelled = false
    setSvg(null)
    setFailed(false)
    if (!source) return
    import('mermaid')
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', htmlLabels: false, flowchart: { htmlLabels: false } })
        const id = `mmd-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
        let out: string | null = null
        for (const text of [source, repair(source)]) {
          try {
            if (!(await mermaid.parse(text, { suppressErrors: true }))) continue
            out = (await mermaid.render(id, text)).svg
            break
          } catch {
          } finally {
            document.getElementById(`d${id}`)?.remove()
          }
        }
        if (cancelled) return
        if (out) setSvg(out)
        else setFailed(true)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [source, rawId])

  if (!source) return null
  if (failed) {
    return (
      <div className="max-w-full overflow-hidden">
        <p className="mb-2 text-xs text-text-muted">This diagram could not be drawn. Its source is shown instead.</p>
        <pre className="max-h-72 max-w-full overflow-x-auto rounded-xl bg-surface-background p-3 text-xs">{source}</pre>
      </div>
    )
  }
  if (!svg) return <Skeleton className="h-64 w-full rounded-xl" />
  return (
    <div role="img" aria-label={title} className="max-w-full overflow-x-auto rounded-xl border border-surface-border bg-white p-3 sm:p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }} />
  )
}
