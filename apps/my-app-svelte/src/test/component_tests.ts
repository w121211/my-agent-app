// apps/my-app-svelte/src/stores/projectStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import {
  projectFolders,
  folderTrees,
  selectedTreeNode,
  selectedChatFile,
  selectedPreviewFile,
  expandedNodes,
  selectFile,
  toggleNodeExpansion,
  selectedProjectFolder,
  hasAnyProjectFolders
} from './projectStore'

describe('projectStore', () => {
  beforeEach(() => {
    // Reset all stores
    projectFolders.set([])
    folderTrees.set({})
    selectedTreeNode.set(null)
    selectedChatFile.set(null)
    selectedPreviewFile.set(null)
    expandedNodes.set(new Set())
  })

  describe('selectFile', () => {
    it('should select chat file and update related stores', () => {
      selectFile('/path/to/chat.chat.json')

      expect(get(selectedTreeNode)).toBe('/path/to/chat.chat.json')
      expect(get(selectedChatFile)).toBe('/path/to/chat.chat.json')
      expect(get(selectedPreviewFile)).toBeNull()
    })

    it('should select regular file for preview', () => {
      selectFile('/path/to/file.ts')

      expect(get(selectedTreeNode)).toBe('/path/to/file.ts')
      expect(get(selectedChatFile)).toBeNull()
      expect(get(selectedPreviewFile)).toBe('/path/to/file.ts')
    })
  })

  describe('toggleNodeExpansion', () => {
    it('should expand node when collapsed', () => {
      const nodePath = '/path/to/node'
      
      toggleNodeExpansion(nodePath)
      
      expect(get(expandedNodes).has(nodePath)).toBe(true)
    })

    it('should collapse node when expanded', () => {
      const nodePath = '/path/to/node'
      expandedNodes.set(new Set([nodePath]))
      
      toggleNodeExpansion(nodePath)
      
      expect(get(expandedNodes).has(nodePath)).toBe(false)
    })
  })

  describe('derived stores', () => {
    it('should compute selectedProjectFolder correctly', () => {
      const folders = [
        { id: '1', name: 'Project 1', path: '/project1' },
        { id: '2', name: 'Project 2', path: '/project2' }
      ]
      
      projectFolders.set(folders)
      selectedTreeNode.set('/project1/file.ts')

      expect(get(selectedProjectFolder)).toEqual(folders[0])
    })

    it('should compute hasAnyProjectFolders correctly', () => {
      expect(get(hasAnyProjectFolders)).toBe(false)
      
      projectFolders.set([{ id: '1', name: 'Project', path: '/project' }])
      
      expect(get(hasAnyProjectFolders)).toBe(true)
    })
  })
})

// apps/my-app-svelte/src/stores/uiStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'
import {
  loadingStates,
  toasts,
  setLoading,
  showToast,
  removeToast,
  isAnyLoading,
  activeToastCount
} from './uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    loadingStates.set({})
    toasts.set([])
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('loading states', () => {
    it('should set and clear loading states', () => {
      setLoading('testOperation', true)
      expect(get(loadingStates)).toEqual({ testOperation: true })
      expect(get(isAnyLoading)).toBe(true)

      setLoading('testOperation', false)
      expect(get(loadingStates)).toEqual({ testOperation: false })
      expect(get(isAnyLoading)).toBe(false)
    })
  })

  describe('toast notifications', () => {
    it('should add toast notification', () => {
      const toastId = showToast('Test message', 'success')
      
      const currentToasts = get(toasts)
      expect(currentToasts).toHaveLength(1)
      expect(currentToasts[0].message).toBe('Test message')
      expect(currentToasts[0].type).toBe('success')
      expect(currentToasts[0].id).toBe(toastId)
      expect(get(activeToastCount)).toBe(1)
    })

    it('should auto-remove non-error toasts', () => {
      showToast('Test message', 'info', 1000)
      
      expect(get(toasts)).toHaveLength(1)
      
      vi.advanceTimersByTime(1000)
      
      expect(get(toasts)).toHaveLength(0)
    })

    it('should not auto-remove error toasts', () => {
      showToast('Error message', 'error')
      
      expect(get(toasts)).toHaveLength(1)
      
      vi.advanceTimersByTime(10000)
      
      expect(get(toasts)).toHaveLength(1)
    })

    it('should manually remove toast', () => {
      const toastId = showToast('Test message')
      expect(get(toasts)).toHaveLength(1)
      
      removeToast(toastId)
      expect(get(toasts)).toHaveLength(0)
    })
  })
})

// apps/my-app-svelte/src/components/shared/FileIcon.test.ts
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/svelte'
import FileIcon from './FileIcon.svelte'

describe('FileIcon', () => {
  it('should render folder icon for directories', () => {
    const { container } = render(FileIcon, {
      props: {
        fileName: 'test-folder',
        isDirectory: true,
        isExpanded: false
      }
    })
    
    // Check if folder icon is rendered
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render open folder icon for expanded directories', () => {
    const { container } = render(FileIcon, {
      props: {
        fileName: 'test-folder',
        isDirectory: true,
        isExpanded: true
      }
    })
    
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render chat icon for chat files', () => {
    const { container } = render(FileIcon, {
      props: {
        fileName: 'chat.chat.json',
        isDirectory: false
      }
    })
    
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render appropriate icon for TypeScript files', () => {
    const { container } = render(FileIcon, {
      props: {
        fileName: 'component.ts',
        isDirectory: false
      }
    })
    
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

// apps/my-app-svelte/src/components/shared/ToastProvider.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import ToastProvider from './ToastProvider.svelte'
import { showToast, toasts } from '$stores'

describe('ToastProvider', () => {
  beforeEach(() => {
    toasts.set([])
  })

  it('should render children content', () => {
    render(ToastProvider, {
      props: {
        children: () => 'Test content'
      }
    })
    
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should display toast notifications', () => {
    render(ToastProvider, {
      props: {
        children: () => ''
      }
    })
    
    showToast('Test notification', 'success')
    
    expect(screen.getByText('Test notification')).toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('should allow dismissing toasts', async () => {
    const user = userEvent.setup()
    
    render(ToastProvider, {
      props: {
        children: () => ''
      }
    })
    
    showToast('Test notification', 'info')
    
    expect(screen.getByText('Test notification')).toBeInTheDocument()
    
    const closeButton = screen.getByRole('button', { name: /close notification/i })
    await user.click(closeButton)
    
    expect(screen.queryByText('Test notification')).not.toBeInTheDocument()
  })

  it('should render different toast types with appropriate styling', () => {
    render(ToastProvider, {
      props: {
        children: () => ''
      }
    })
    
    showToast('Success message', 'success')
    showToast('Error message', 'error')
    showToast('Warning message', 'warning')
    showToast('Info message', 'info')
    
    expect(screen.getByText('Success message')).toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.getByText('Warning message')).toBeInTheDocument()
    expect(screen.getByText('Info message')).toBeInTheDocument()
  })
})