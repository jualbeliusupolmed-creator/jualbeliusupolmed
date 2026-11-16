---
title: "[Good First Issue] Add React Error Boundary for graceful error handling"
labels: ["good-first-issue", "frontend", "error-handling"]
assignees: ""
---

## Description
Add a React Error Boundary component to catch rendering errors and show a friendly fallback UI instead of crashing the whole page.

## Acceptance Criteria
- [ ] Create `ErrorBoundary` component in `src/components/ErrorBoundary.tsx`
- [ ] Implement `getDerivedStateFromError` and `componentDidCatch`
- [ ] Show user-friendly fallback: "Something went wrong. Please refresh or contact support."
- [ ] Include "Try Again" button that resets error state
- [ ] Log error to structured logger (`src/lib/logger.ts`)
- [ ] Wrap key page sections: `/jual`, `/dashboard`, `/produk/[slug]`, `/jual-beli`
- [ ] Test by temporarily throwing an error in a child component

## Files to Create
- `src/components/ErrorBoundary.tsx`

## Files to Modify
- Page layouts to wrap content with `<ErrorBoundary>`

## Estimated Effort
**M** (3-5 hours)

## Example Implementation
```tsx
// src/components/ErrorBoundary.tsx
'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { createLogger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  private logger = createLogger({ component: 'ErrorBoundary' })

  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.logger.error({ err: error, componentStack: errorInfo.componentStack }, 'React render error caught')
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Something went wrong. Please refresh the page or contact support.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

## Verification
```bash
npm run dev
# Temporarily add `throw new Error('test')` in a child component
# Verify ErrorBoundary catches it and shows fallback
npm run test
npm run lint
```