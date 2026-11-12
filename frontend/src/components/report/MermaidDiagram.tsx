import { useEffect, useId, useState } from 'react'
import { Skeleton } from '../ui/Skeleton'

/** The extractor escapes newlines and quotes inside the JSON string; this undoes it and strips code fences. */
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

/**
 * AI-written flowcharts often leave brackets, colons or slashes inside unquoted labels, which Mermaid rejects
 * ("Syntax error in text"). This wraps such labels in quotes. It only touches graph/flowchart diagrams.
 */
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

/**
 * Renders Mermaid source as an SVG. The library is loaded on demand (it is large) and runs in "strict" security
 * mode, which sanitises the output - the diagram text comes from an AI model, so it is treated as untrusted.
 */
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
        // Plain SVG text labels (not HTML in foreignObject): they survive sanitising and scale cleanly.
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', htmlLabels: false, flowchart: { htmlLabels: false } })
        const id = `mmd-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
        let out: string | null = null
        for (const text of [source, repair(source)]) {
          try {
            // parse() first, so a bad diagram never leaves Mermaid's "Syntax error" block in the page.
            if (!(await mermaid.parse(text, { suppressErrors: true }))) continue
            out = (await mermaid.render(id, text)).svg
            break
          } catch {
            /* try the repaired source next */
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
      <div>
        <p className="mb-2 text-xs text-text-muted">This diagram could not be drawn. Its source is shown instead.</p>
        <pre className="max-h-72 overflow-auto rounded-lg bg-surface-background p-3 text-xs">{source}</pre>
      </div>
    )
  }
  if (!svg) return <Skeleton className="h-64 w-full rounded-xl" />
  return (
    <div role="img" aria-label={title} className="overflow-x-auto rounded-xl border border-surface-border bg-white p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }} />
  )
}
