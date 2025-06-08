<!-- docs/design_app/desing-app-component-flow.md -->

## Revised Main App Architecture

```
App
├── TRPCProvider (API client setup)
└── MainLayout
    ├── ExplorerPanel (280px) - handles own events
    ├── ChatPanel (Flexible) - handles own events
    └── PreviewPanel (360px) - handles own events
```

## Global State Management (Zustand)

**AppStore:**

```typescript
interface AppStore {
  // Current selections
  selectedChatFile: string | null;
  selectedPreviewFile: string | null;
  selectedTreeNode: string | null;

  // Project folders and tree data
  projectFolders: ProjectFolder[];
  folderTrees: Record<string, FolderTreeNode>; // projectFolderId -> tree

  // UI state
  isNewChatModalOpen: boolean;

  // Actions
  setSelectedChatFile: (path: string | null) => void;
  setSelectedPreviewFile: (path: string | null) => void;
  setSelectedTreeNode: (path: string | null) => void;
  setProjectFolders: (folders: ProjectFolder[]) => void;
  updateFolderTree: (projectFolderId: string, tree: FolderTreeNode) => void;
  // ...
}
```

---

## Revised Component Flow Design

### 1. **App Component (Root)**

**On Mount:**

- Initialize tRPC client
- Call `trpc.userSettings.getSettings` to get initial settings
- No global event subscriptions (each component handles its own)

**State Management:**

- Setup Zustand store
- Basic app initialization only

---

### 2. **ExplorerPanel Component**

**On Mount:**

- Call `trpc.projectFolder. ` to populate folder tree
- For each project folder, call `trpc.projectFolder.getFolderTree` to get complete tree
- Store complete folder trees in Zustand store
- Subscribe to `trpc.event.fileWatcherEvents` (component-level subscription)
- Subscribe to `trpc.event.projectFolderEvents` (component-level subscription)
- **Remove:** ~~Start watching call~~ (backend handles this automatically)

**User Interactions:**

**Add Project Folder Flow:**

- User clicks `[+ Add Project Folder]`
- Opens system file selection dialog
- Calls `trpc.projectFolder.addProjectFolder.mutate` with selected path
- On success response: Call `trpc.projectFolder.getFolderTree` for new folder
- Update Zustand store with new project folder and its tree

**Folder Tree Navigation:**

- User clicks folder name → expand/collapse folder contents (pure UI state)
- **Remove:** ~~Lazy loading~~ (use complete tree from Zustand store)
- **Remove:** ~~API calls for expansion~~ (all data already cached)

**New Chat Creation:**

- **Only top-level `[+ New Chat]` button**
- Opens NewChatModal
- If `selectedTreeNode` exists in store → pre-fill target directory
- If no `selectedTreeNode` → target directory empty (user must select)

**File/Chat Selection:**

- User clicks chat file → Update `selectedChatFile` in Zustand store
- User clicks regular file → Update `selectedPreviewFile` in Zustand store
- Components react to store changes

**Real-time Updates (Component-level event handling):**

- `FileWatcherEvent` → Update corresponding folder tree in Zustand store
- `ProjectFolderUpdatedEvent` → Refresh project folders list and trees

---

### 3. **ChatPanel Component**

**On Store Change (selectedChatFile):**

- React to `selectedChatFile` changes from Zustand store
- Call `trpc.chat.openChatFile.query` to load chat data
- **Remove:** ~~Subscribe to chatEvents~~ (use submitMessage response instead)
- Display chat history and initialize message input

**Message Submission Flow:**

- User types message and **presses Enter or clicks Send**
- **Immediately add message to UI** with empty submit time
- Call `trpc.chat.submitMessage.mutate` with message content
- **On response:** Update message with actual submit time from server
- **Remove:** ~~Listen for ChatUpdatedEvent~~ (use mutation response)

**File Reference Handling:**

- Detect `#` character in message input
- Show file autocomplete dropdown using folder trees from Zustand store
- Validate file references before sending

**Extensions Menu:**

- **Mock implementations for Phase-1**
- "Summarize" button → Show placeholder/mock
- ~~"What's Next?" button~~ → **Removed for Phase-1**

---

### 4. **PreviewPanel Component**

**On Store Change (selectedPreviewFile):**

- React to `selectedPreviewFile` changes from Zustand store
- Call `trpc.file.getFileType.query` to determine file type
- Call `trpc.file.openFile.query` to load file content
- **Simple text display only + basic metadata for non-text files**

**Simplified Display:**

- Text files → Plain text display
- Non-text files → Show basic metadata only
- **Remove:** ~~Advanced previews, action buttons~~ (Phase-1 not needed)

---

### 5. **NewChatModal Component**

**On Open:**

- Check `selectedTreeNode` from Zustand store for pre-filling target directory
- **Remove:** ~~Load task knowledge~~ (simplified for Phase-1)
- Initialize form with default values

**User Interactions:**

- Directory selection (required if no pre-filled directory)
- Chat/Agent mode toggle
- Model selection dropdown
- **Remove:** ~~Knowledge files selection~~ (Phase-1 not needed)
- Prompt text area
- "Create New Task" checkbox

**On Submit:**

- Show loading state
- If "Create New Task" checked:
  - Call `trpc.task.create.mutate` and wait for server response
  - **Server auto-handles chat creation and returns the created chat data**
  - On success: Update `selectedChatFile` in Zustand store with returned chat file path
- Else:
  - Call `trpc.chat.createChat.mutate` with form data and wait for server response
  - On success: Update `selectedChatFile` in Zustand store with returned chat file path
- Close modal only after successful API response
- Folder tree will update via FileWatcherEvent

---

### 6. **~~WhatsNextModal Component~~**

**Removed for Phase-1**

---

### 7. **TaskManagement (Simplified)**

**Task Creation:**

- Only triggered when "Create New Task" is checked in NewChatModal
- Call `trpc.task.create.mutate` → **Server handles chat creation automatically**
- **Remove:** ~~Separate chat creation call~~

**Task Status Updates:**

- Subscribe to `trpc.event.taskEvents` in ExplorerPanel (component-level)
- Display status icons in folder tree (✓, 🏃, ⏸️, etc.)
- **Click interaction:**
  - Click task with 🏃 (running) → Call `trpc.task.stop.mutate`
  - Click task with ⏸️ (stopped) → Call `trpc.task.start.mutate`
- **Remove:** ~~Resume functionality~~ (only start/stop)

---

## Revised Event Handling Strategy

**No Global Event Subscriptions:**

- Each component subscribes to relevant events independently
- Event handling logic stays within responsible components

**ExplorerPanel Events:**

- `FileWatcherEvent` → Update folder trees in Zustand store
- `ProjectFolderUpdatedEvent` → Refresh project folders
- `TaskUpdatedEvent` → Update task status icons

**ChatPanel Events:**

- **Remove:** ~~ChatUpdatedEvent~~ (use mutation responses)

**No Cross-Component Event Coordination:**

- Use Zustand store for state sharing instead of events

---

## Zustand Store Structure

```typescript
interface AppStore {
  // Selections
  selectedChatFile: string | null;
  selectedPreviewFile: string | null;
  selectedTreeNode: string | null;

  // Data
  projectFolders: ProjectFolder[];
  folderTrees: Record<string, FolderTreeNode>;
  expandedNodes: Set<string>; // UI state for tree expansion

  // UI state
  isNewChatModalOpen: boolean;

  // Actions
  setSelectedChatFile: (path: string | null) => void;
  setSelectedPreviewFile: (path: string | null) => void;
  setSelectedTreeNode: (path: string | null) => void;
  setProjectFolders: (folders: ProjectFolder[]) => void;
  updateFolderTree: (projectFolderId: string, tree: FolderTreeNode) => void;
  toggleNodeExpansion: (nodePath: string) => void;
  openNewChatModal: () => void;
  closeNewChatModal: () => void;
}
```

---

## Revised MVP Implementation Priority

**Phase 1 (Core MVP):**

1. ExplorerPanel with complete folder tree and file watching
2. ChatPanel with message display, input (Enter to send), and immediate UI updates
3. Basic text file preview in PreviewPanel
4. Project folder add/remove functionality
5. NewChatModal with task creation option
6. Basic task start/stop functionality

**Phase 2 (Enhanced):** 7. File reference autocomplete using folder tree data 8. Enhanced file type support in PreviewPanel 9. Extensions menu implementation 10. WhatsNextModal component

**Phase 3 (Polish):** 11. Keyboard shortcuts 12. Error handling and retry logic 13. Performance optimizations 14. Advanced UI polish
