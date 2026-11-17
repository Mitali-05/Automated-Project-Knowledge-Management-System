import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './States'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Page rendering failed', error, info.componentStack) }
  render() {
    return this.state.failed
      ? <main className="mx-auto max-w-3xl p-8"><ErrorState message="This page could not be displayed. Reload the app to try again." onRetry={() => window.location.reload()} /></main>
      : this.props.children
  }
}
