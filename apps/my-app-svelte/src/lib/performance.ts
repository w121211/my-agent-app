// apps/my-app-svelte/src/lib/performance.ts
import { tick } from 'svelte'

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()
  private observers: PerformanceObserver[] = []

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  constructor() {
    this.setupObservers()
  }

  private setupObservers() {
    if (typeof window === 'undefined') return

    // Observe paint metrics
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(`paint.${entry.name}`, entry.startTime)
        }
      })
      paintObserver.observe({ entryTypes: ['paint'] })
      this.observers.push(paintObserver)

      // Observe navigation metrics
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('navigation.loadComplete', entry.loadEventEnd)
        }
      })
      navigationObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navigationObserver)
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)
  }

  async measureAsyncOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      const result = await operation()
      this.recordMetric(name, performance.now() - start)
      return result
    } catch (error) {
      this.recordMetric(`${name}.error`, performance.now() - start)
      throw error
    }
  }

  measureSyncOperation<T>(name: string, operation: () => T): T {
    const start = performance.now()
    try {
      const result = operation()
      this.recordMetric(name, performance.now() - start)
      return result
    } catch (error) {
      this.recordMetric(`${name}.error`, performance.now() - start)
      throw error
    }
  }

  getMetrics() {
    const result: Record<string, { count: number; avg: number; min: number; max: number }> = {}
    
    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        result[name] = {
          count: values.length,
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        }
      }
    }
    
    return result
  }

  clearMetrics() {
    this.metrics.clear()
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics.clear()
  }
}

// Virtual scrolling utility for large lists
export class VirtualScroller {
  private container: HTMLElement
  private itemHeight: number
  private visibleCount: number
  private totalItems: number
  private scrollTop = 0

  constructor(
    container: HTMLElement,
    itemHeight: number,
    visibleCount: number,
    totalItems: number
  ) {
    this.container = container
    this.itemHeight = itemHeight
    this.visibleCount = visibleCount
    this.totalItems = totalItems
  }

  getVisibleRange() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight)
    const endIndex = Math.min(startIndex + this.visibleCount, this.totalItems)
    return { startIndex, endIndex }
  }

  getOffsets() {
    const { startIndex } = this.getVisibleRange()
    const offsetY = startIndex * this.itemHeight
    return { offsetY }
  }

  onScroll(scrollTop: number) {
    this.scrollTop = scrollTop
  }

  getTotalHeight() {
    return this.totalItems * this.itemHeight
  }
}

// Debounced function utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function(this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func.apply(this, args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func.apply(this, args)
  }
}

// Throttled function utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// apps/my-app-svelte/src/components/shared/ErrorBoundary.svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { Logger } from 'tslog'
  import { showToast } from '$stores'
  import { AlertTriangle, RotateCcw, Home } from 'svelte-bootstrap-icons'

  interface ErrorBoundaryProps {
    children: any
    fallback?: any
    onError?: (error: Error, errorInfo: any) => void
  }

  let { children, fallback, onError }: ErrorBoundaryProps = $props()

  const logger = new Logger({ name: 'ErrorBoundary' })

  let hasError = $state(false)
  let error: Error | null = $state(null)
  let errorId = $state('')

  function handleError(event: ErrorEvent) {
    logger.error('Error caught by boundary:', event.error)
    
    hasError = true
    error = event.error
    errorId = Math.random().toString(36).substr(2, 9)
    
    if (onError) {
      onError(event.error, { errorId, timestamp: new Date() })
    }

    showToast('An unexpected error occurred', 'error')
  }

  function handleUnhandledRejection(event: PromiseRejectionEvent) {
    logger.error('Unhandled promise rejection:', event.reason)
    
    hasError = true
    error = new Error(event.reason)
    errorId = Math.random().toString(36).substr(2, 9)
    
    if (onError) {
      onError(error, { errorId, timestamp: new Date(), type: 'promise' })
    }

    showToast('An unexpected error occurred', 'error')
  }

  function retry() {
    hasError = false
    error = null
    errorId = ''
  }

  function goHome() {
    window.location.href = '/'
  }

  function reportError() {
    if (error) {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        errorId
      }
      
      console.log('Error Report:', errorReport)
      showToast('Error report logged to console', 'info')
    }
  }

  onMount(() => {
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  })
</script>

{#if hasError}
  {#if fallback}
    {@render fallback(error, retry)}
  {:else}
    <div class="bg-background text-foreground flex min-h-screen items-center justify-center p-8">
      <div class="text-center max-w-md">
        <div class="text-red-400 mb-6">
          <AlertTriangle class="mx-auto text-6xl" />
        </div>
        
        <h1 class="text-foreground mb-4 text-2xl font-bold">
          Something went wrong
        </h1>
        
        <p class="text-muted mb-6 text-sm">
          An unexpected error occurred. We apologize for the inconvenience.
        </p>

        {#if error}
          <details class="bg-surface border-border mb-6 rounded border p-4 text-left">
            <summary class="text-muted cursor-pointer text-sm font-medium">
              Error Details
            </summary>
            <div class="mt-2 text-xs font-mono text-red-400">
              <div class="mb-2">ID: {errorId}</div>
              <div class="mb-2">Message: {error.message}</div>
              {#if error.stack}
                <pre class="whitespace-pre-wrap text-xs">{error.stack}</pre>
              {/if}
            </div>
          </details>
        {/if}

        <div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onclick={retry}
            class="bg-accent hover:bg-accent/80 flex items-center justify-center rounded px-4 py-2 text-white"
          >
            <RotateCcw class="mr-2 text-sm" />
            Try Again
          </button>
          
          <button
            onclick={goHome}
            class="bg-surface border-border hover:bg-hover flex items-center justify-center rounded border px-4 py-2"
          >
            <Home class="mr-2 text-sm" />
            Go Home
          </button>
          
          <button
            onclick={reportError}
            class="text-muted hover:text-foreground flex items-center justify-center px-4 py-2 text-sm"
          >
            Report Error
          </button>
        </div>
      </div>
    </div>
  {/if}
{:else}
  {@render children()}
{/if}

// apps/my-app-svelte/src/components/shared/LazyLoader.svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { tick } from 'svelte'

  interface LazyLoaderProps {
    children: any
    placeholder?: any
    threshold?: number
    rootMargin?: string
  }

  let { 
    children, 
    placeholder, 
    threshold = 0.1, 
    rootMargin = '50px' 
  }: LazyLoaderProps = $props()

  let container: HTMLElement
  let isVisible = $state(false)
  let observer: IntersectionObserver

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          isVisible = true
          observer.unobserve(container)
        }
      },
      { threshold, rootMargin }
    )

    if (container) {
      observer.observe(container)
    }

    return () => {
      if (observer && container) {
        observer.unobserve(container)
      }
    }
  })
</script>

<div bind:this={container}>
  {#if isVisible}
    {@render children()}
  {:else if placeholder}
    {@render placeholder()}
  {:else}
    <div class="bg-muted/10 animate-pulse rounded h-20 w-full"></div>
  {/if}
</div>