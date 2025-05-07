# Workspace Management Event Flow (MVP)

<!--
Implementation Notes:
- Use folder name as workspace name
- Automatically append numeric suffix for duplicate workspace names (e.g., "folder-name-1", "folder-name-2")
- If selected folder is already a subfolder of an existing workspace, don't add it - just open that folder in the explorer
- For MVP: Implement workspace management through the Settings page only
- Future enhancement: Allow drag-and-drop folders into explorer (without confirmation dialog)
- Use generic events to reduce event types (e.g., ClientUpdateUserSettings instead of specialized workspace events)
- File watcher system needs to be updated when workspace is added or removed
- Frontend should request initial workspace tree structure after a workspace is added
- For workspace removal, UI can default to an unselected state rather than forcing selection of another workspace
- When no workspaces exist, the explorer should show a prompt to add workspaces via Settings
-->

## 1. Add Workspace Flow

### User Story

A user wants to add a local folder as a workspace to the application. They navigate to the Settings page, click "Add Workspace", select a folder using the system's file picker, and confirm their selection. The folder is then added to the workspace list in the application.

### Core Event Flow

```
# User Interaction
UISettingsPageOpened
→ UIAddWorkspaceButtonClicked

# System File Picker
→ UISystemFilePickerOpened
→ UISystemFolderSelected {folderPath}

# Client Command
→ ClientUpdateUserSettings {
    type: "WORKSPACE_ADDED",
    workspacePath: folderPath
  }

# Server Processing
→ ServerWorkspaceValidated {
    folderPath,
    isValid,
    validationMessage
  }

(if isValid === true)
  → ServerFileWatcherUpdated {workspacePath, action: "add"}
  → ServerUserSettingsUpdated {
      settings: updatedSettings,
      changeType: "WORKSPACE_ADDED"
    }

  # UI 基於 ServerUserSettingsUpdated 更新 settings page、workspace explorer
  → UISettingsPageUpdated {currentSettings}

(else)
  → UISettingsErrorShown {validationMessage}

# Request Workspace Tree
→ ClientRequestWorkspaceFolderTree {workspacePath}
→ ServerWorkspaceFolderTreeResponsed {workspacePath, folderTree}
→ UIWorkspaceExplorerUpdated {workspaces}
```

## 2. Remove Workspace Flow

### User Story

A user wants to remove a workspace from the application. They navigate to the Settings page where all workspaces are listed, click the "Remove" button next to the workspace they want to remove, and the workspace is immediately removed from the application.

### Core Event Flow

```
# User Interaction
UISettingsPageOpened
→ UIRemoveWorkspaceButtonClicked {workspacePath}

# Client Command
→ ClientUpdateUserSettings {
    type: "WORKSPACE_REMOVED",
    workspacePath
  }

# Server Processing
→ ServerFileWatcherUpdated {workspacePath, action: "remove"}
→ ServerUserSettingsUpdated {
    settings: updatedSettings,
    changeType: "WORKSPACE_REMOVED"
  }

# UI 基於 ServerUserSettingsUpdated 更新 settings page、workspace explorer
→ UIWorkspaceExplorerUpdated {workspaces}
→ UISettingsPageUpdated {currentSettings}

# UI Explorer State
# (No event needed - UI naturally displays "Add workspace via Settings" when no workspaces exist)
```
