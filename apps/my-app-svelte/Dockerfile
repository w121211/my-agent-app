# apps/my-app-svelte/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/events-core/package*.json ./packages/events-core/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# apps/my-app-svelte/nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }
}

# apps/my-app-svelte/docker-compose.yml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:80"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend

  backend:
    build: ../events-core
    ports:
      - "3333:3333"
    environment:
      - NODE_ENV=production
      - PORT=3333
    volumes:
      - ./data:/app/data

# apps/my-app-svelte/.github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run type checking
      run: npm run check
    
    - name: Run tests
      run: npm run test:coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v4
      with:
        name: dist
        path: dist/

  deploy:
    runs-on: ubuntu-latest
    needs: [test, build]
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Download build artifacts
      uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
    
    - name: Deploy to production
      run: |
        echo "Deploy to production server"
        # Add your deployment commands here

# apps/my-app-svelte/src/lib/development.ts
import { get } from 'svelte/store'
import { PerformanceMonitor } from './performance'
import { 
  projectFolders, 
  currentChat, 
  tasks, 
  loadingStates, 
  toasts,
  connectionStates 
} from '$stores'

export class DevelopmentTools {
  private static instance: DevelopmentTools
  private performanceMonitor: PerformanceMonitor

  static getInstance(): DevelopmentTools {
    if (!DevelopmentTools.instance) {
      DevelopmentTools.instance = new DevelopmentTools()
    }
    return DevelopmentTools.instance
  }

  constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance()
    this.setupDevTools()
  }

  private setupDevTools() {
    if (typeof window === 'undefined' || import.meta.env.PROD) return

    // Add dev tools to window for console access
    ;(window as any).__SVELTE_DEV_TOOLS__ = {
      stores: {
        projectFolders,
        currentChat,
        tasks,
        loadingStates,
        toasts,
        connectionStates
      },
      utils: {
        getStoreValues: this.getStoreValues.bind(this),
        getPerformanceMetrics: this.getPerformanceMetrics.bind(this),
        clearMetrics: this.clearMetrics.bind(this),
        logState: this.logState.bind(this),
        exportState: this.exportState.bind(this),
        importState: this.importState.bind(this)
      }
    }

    console.log('🔧 Development tools available at window.__SVELTE_DEV_TOOLS__')
  }

  getStoreValues() {
    return {
      projectFolders: get(projectFolders),
      currentChat: get(currentChat),
      tasks: get(tasks),
      loadingStates: get(loadingStates),
      toasts: get(toasts),
      connectionStates: get(connectionStates)
    }
  }

  getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics()
  }

  clearMetrics() {
    this.performanceMonitor.clearMetrics()
    console.log('Performance metrics cleared')
  }

  logState() {
    console.log('Current Application State:', this.getStoreValues())
  }

  exportState() {
    const state = this.getStoreValues()
    const blob = new Blob([JSON.stringify(state, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `app-state-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  importState(stateJson: string) {
    try {
      const state = JSON.parse(stateJson)
      
      if (state.projectFolders) projectFolders.set(state.projectFolders)
      if (state.currentChat) currentChat.set(state.currentChat)
      if (state.tasks) tasks.set(state.tasks)
      if (state.loadingStates) loadingStates.set(state.loadingStates)
      if (state.toasts) toasts.set(state.toasts)
      if (state.connectionStates) connectionStates.set(state.connectionStates)
      
      console.log('State imported successfully')
    } catch (error) {
      console.error('Failed to import state:', error)
    }
  }
}

// Initialize dev tools in development
if (import.meta.env.DEV) {
  DevelopmentTools.getInstance()
}

// Hot module replacement support
if (import.meta.hot) {
  import.meta.hot.accept()
}

// apps/my-app-svelte/src/components/shared/DevPanel.svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { DevelopmentTools } from '$lib/development'
  import { PerformanceMonitor } from '$lib/performance'
  import { 
    Bug, 
    Speedometer2, 
    Database, 
    Download, 
    Upload,
    XLg 
  } from 'svelte-bootstrap-icons'

  let isOpen = $state(false)
  let devTools: DevelopmentTools
  let performanceMonitor: PerformanceMonitor
  let storeValues = $state({})
  let performanceMetrics = $state({})

  onMount(() => {
    // Only show in development
    if (import.meta.env.PROD) return

    devTools = DevelopmentTools.getInstance()
    performanceMonitor = PerformanceMonitor.getInstance()
    
    // Update data periodically
    const interval = setInterval(() => {
      if (isOpen) {
        storeValues = devTools.getStoreValues()
        performanceMetrics = devTools.getPerformanceMetrics()
      }
    }, 1000)

    // Keyboard shortcut to toggle dev panel
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        isOpen = !isOpen
      }
    }

    document.addEventListener('keydown', handleKeydown)

    return () => {
      clearInterval(interval)
      document.removeEventListener('keydown', handleKeydown)
    }
  })

  function handleExportState() {
    devTools.exportState()
  }

  function handleImportState() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          devTools.importState(content)
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  function clearMetrics() {
    devTools.clearMetrics()
    performanceMetrics = {}
  }

  // Show only in development
  $: showPanel = import.meta.env.DEV
</script>

{#if showPanel}
  <!-- Toggle Button -->
  <button
    onclick={() => isOpen = !isOpen}
    class="fixed bottom-4 right-4 z-40 rounded-full bg-purple-600 p-2 text-white shadow-lg hover:bg-purple-700"
    title="Dev Tools (Ctrl+Shift+D)"
  >
    <Bug class="text-lg" />
  </button>

  <!-- Dev Panel -->
  {#if isOpen}
    <div class="fixed bottom-16 right-4 z-50 w-96 max-h-[80vh] overflow-hidden rounded-lg bg-surface border border-border shadow-xl">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border p-3">
        <h3 class="text-foreground font-semibold">Development Tools</h3>
        <button
          onclick={() => isOpen = false}
          class="text-muted hover:text-foreground"
        >
          <XLg class="text-sm" />
        </button>
      </div>

      <!-- Content -->
      <div class="max-h-[60vh] overflow-y-auto p-3 space-y-4">
        <!-- Actions -->
        <div class="space-y-2">
          <button
            onclick={handleExportState}
            class="flex w-full items-center rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Download class="mr-2 text-sm" />
            Export State
          </button>
          <button
            onclick={handleImportState}
            class="flex w-full items-center rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
          >
            <Upload class="mr-2 text-sm" />
            Import State
          </button>
          <button
            onclick={clearMetrics}
            class="flex w-full items-center rounded bg-orange-600 px-3 py-2 text-sm text-white hover:bg-orange-700"
          >
            <Speedometer2 class="mr-2 text-sm" />
            Clear Metrics
          </button>
        </div>

        <!-- Store Values -->
        <div>
          <h4 class="text-foreground mb-2 flex items-center font-medium">
            <Database class="mr-2 text-sm" />
            Store Values
          </h4>
          <div class="bg-panel rounded border border-border p-2">
            <pre class="text-xs text-muted overflow-x-auto">{JSON.stringify(storeValues, null, 2)}</pre>
          </div>
        </div>

        <!-- Performance Metrics -->
        <div>
          <h4 class="text-foreground mb-2 flex items-center font-medium">
            <Speedometer2 class="mr-2 text-sm" />
            Performance
          </h4>
          <div class="bg-panel rounded border border-border p-2">
            <pre class="text-xs text-muted overflow-x-auto">{JSON.stringify(performanceMetrics, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}