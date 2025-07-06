// apps/my-app-svelte/src/test/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock tRPC client
vi.mock('$services/TrpcClient', () => ({
  trpcClient: {
    projectFolder: {
      getAllProjectFolders: {
        query: vi.fn()
      },
      addProjectFolder: {
        mutate: vi.fn()
      },
      getFolderTree: {
        query: vi.fn()
      }
    },
    chat: {
      createEmptyChat: {
        mutate: vi.fn()
      },
      openChatFile: {
        query: vi.fn()
      },
      submitMessage: {
        mutate: vi.fn()
      }
    },
    file: {
      openFile: {
        query: vi.fn()
      },
      getFileType: {
        query: vi.fn()
      }
    },
    task: {
      getAll: {
        query: vi.fn()
      },
      create: {
        mutate: vi.fn()
      }
    },
    event: {
      fileWatcherEvents: {
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
      },
      chatEvents: {
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
      },
      taskEvents: {
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
      },
      projectFolderEvents: {
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
      }
    }
  }
}))

// Mock logger
vi.mock('tslog', () => ({
  Logger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }))
}))

// apps/my-app-svelte/src/services/ProjectService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProjectService } from './ProjectService'
import { trpcClient } from './TrpcClient'
import { get } from 'svelte/store'
import { projectFolders, folderTrees } from '$stores'

describe('ProjectService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset stores
    projectFolders.set([])
    folderTrees.set({})
  })

  describe('loadProjectFolders', () => {
    it('should load project folders and update store', async () => {
      const mockFolders = [
        { id: '1', name: 'Project 1', path: '/path/to/project1' },
        { id: '2', name: 'Project 2', path: '/path/to/project2' }
      ]

      vi.mocked(trpcClient.projectFolder.getAllProjectFolders.query)
        .mockResolvedValue(mockFolders)
      
      vi.mocked(trpcClient.projectFolder.getFolderTree.query)
        .mockResolvedValue({
          name: 'project1',
          path: '/path/to/project1',
          isDirectory: true,
          children: []
        })

      await ProjectService.loadProjectFolders()

      expect(get(projectFolders)).toEqual(mockFolders)
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(trpcClient.projectFolder.getAllProjectFolders.query)
        .mockRejectedValue(new Error('API Error'))

      await expect(ProjectService.loadProjectFolders()).rejects.toThrow('API Error')
    })
  })

  describe('addProjectFolder', () => {
    it('should add new project folder', async () => {
      const newFolder = { id: '3', name: 'New Project', path: '/path/to/new' }
      
      vi.mocked(trpcClient.projectFolder.addProjectFolder.mutate)
        .mockResolvedValue(newFolder)
      
      vi.mocked(trpcClient.projectFolder.getFolderTree.query)
        .mockResolvedValue({
          name: 'new',
          path: '/path/to/new',
          isDirectory: true,
          children: []
        })

      const result = await ProjectService.addProjectFolder('/path/to/new')

      expect(result).toEqual(newFolder)
      expect(get(projectFolders)).toContainEqual(newFolder)
    })
  })

  describe('selectTreeNode', () => {
    it('should select chat file correctly', () => {
      ProjectService.selectTreeNode('/path/to/chat.chat.json')

      expect(get(selectedTreeNode)).toBe('/path/to/chat.chat.json')
      expect(get(selectedChatFile)).toBe('/path/to/chat.chat.json')
      expect(get(selectedPreviewFile)).toBeNull()
    })

    it('should select regular file for preview', () => {
      ProjectService.selectTreeNode('/path/to/file.ts')

      expect(get(selectedTreeNode)).toBe('/path/to/file.ts')
      expect(get(selectedChatFile)).toBeNull()
      expect(get(selectedPreviewFile)).toBe('/path/to/file.ts')
    })
  })
})

// apps/my-app-svelte/src/services/FileService.test.ts
import { describe, it, expect, vi } from 'vitest'
import { FileService } from './FileService'

describe('FileService', () => {
  describe('getFileIcon', () => {
    it('should return correct icons for directories', () => {
      expect(FileService.getFileIcon('folder', true, false)).toBe('folder')
      expect(FileService.getFileIcon('folder', true, true)).toBe('folder-open')
    })

    it('should return correct icons for chat files', () => {
      expect(FileService.getFileIcon('chat.chat.json', false)).toBe('chat-dots')
    })

    it('should return correct icons for code files', () => {
      expect(FileService.getFileIcon('file.ts', false)).toBe('file-code')
      expect(FileService.getFileIcon('file.js', false)).toBe('file-code')
      expect(FileService.getFileIcon('file.html', false)).toBe('file-earmark-code')
    })

    it('should return default icon for unknown files', () => {
      expect(FileService.getFileIcon('file.unknown', false)).toBe('file-earmark')
    })
  })

  describe('extractFileReferences', () => {
    it('should extract file references from content', () => {
      const content = 'Check out #file.ts and #image.png for details'
      const references = FileService.extractFileReferences(content)

      expect(references).toEqual([
        { path: 'file.ts', type: 'file' },
        { path: 'image.png', type: 'image' }
      ])
    })

    it('should handle content with no references', () => {
      const content = 'This is just regular text'
      const references = FileService.extractFileReferences(content)

      expect(references).toEqual([])
    })
  })

  describe('isImageFile', () => {
    it('should identify image files correctly', () => {
      expect(FileService.isImageFile('image.png')).toBe(true)
      expect(FileService.isImageFile('photo.jpg')).toBe(true)
      expect(FileService.isImageFile('icon.svg')).toBe(true)
      expect(FileService.isImageFile('document.pdf')).toBe(false)
      expect(FileService.isImageFile('script.js')).toBe(false)
    })
  })
})