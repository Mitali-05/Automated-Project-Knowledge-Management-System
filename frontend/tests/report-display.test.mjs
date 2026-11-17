import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const source = await readFile(new URL('../src/pages/project/ReportTab.tsx', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source + '\nexport { Overview, Verification };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
})
const nativeRequire = createRequire(import.meta.url)
const component = ({ children }) => React.createElement('div', null, children)
const modules = new Proxy({}, { get: () => component })
const exports = {}
new Function('require', 'exports', outputText)(name => {
  if (name === 'react' || name === 'react/jsx-runtime') return nativeRequire(name)
  if (name.endsWith('/cn')) return { cn: (...values) => values.join(' ') }
  return modules
}, exports)

test('verification never presents report-only model scores as measured certification', () => {
  const html = renderToStaticMarkup(React.createElement(exports.Verification, { r: {
    inspected_files: ['app/main.py', 'app/main.py'], knowledge_items: [{ evidence_ids: ['app/main.py'] }],
    verification_report: { verdict: 'VERIFIED_PRODUCTION_GRADE', overall_trust_score: 100,
      evidence_precision_score: 100, hallucination_rate: 0, audit_findings: ['A reported finding'] },
  } }))
  assert.match(html, /AI review with limitations/)
  assert.match(html, /does not independently inspect full source bodies/)
  assert.doesNotMatch(html, /100%|empirically calculated|backed by inspected AST|trust score/)
  assert.match(html, /A reported finding/)
})

test('legacy cited paths are not relabeled as successful source reads', () => {
  const html = renderToStaticMarkup(React.createElement(exports.Verification, { r: {
    knowledge_items: [{ evidence_ids: ['app/main.py'] }],
  } }))
  assert.match(html, /older report has no recorded file-read inventory/)
  assert.match(html, /app\/main.py/)
})

test('long security observations remain fully readable outside metric tiles', () => {
  const observation = 'A long source-supported security observation. '.repeat(15) + 'END_OF_SECURITY_FINDING'
  const html = renderToStaticMarkup(React.createElement(exports.Overview, { r: {
    analytics_metrics: { security_posture: observation },
  } }))
  assert.match(html, /Security observations/)
  assert.match(html, /END_OF_SECURITY_FINDING/)
  assert.doesNotMatch(html, /Security posture/)
})
