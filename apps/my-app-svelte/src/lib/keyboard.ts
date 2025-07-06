// apps/my-app-svelte/src/lib/keyboard.ts
import { get } from "svelte/store";
import {
  selectedTreeNode,
  selectedChatFile,
  selectedPreviewFile,
} from "../stores/tree-store";
import { chatService } from "../services/chat-service";
import { projectService } from "../services/project-service";
import { showToast } from "../stores/ui-store";

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  handler: () => void | Promise<void>;
  preventDefault?: boolean;
}

export class KeyboardManager {
  private shortcuts: KeyboardShortcut[] = [];
  private isEnabled = true;

  constructor() {
    this.setupDefaultShortcuts();
    this.bindEvents();
  }

  private setupDefaultShortcuts() {
    this.shortcuts = [
      // Navigation shortcuts
      {
        key: "n",
        ctrlKey: true,
        description: "Create new chat in selected folder",
        handler: this.handleNewChat,
        preventDefault: true,
      },
      {
        key: "p",
        ctrlKey: true,
        shiftKey: true,
        description: "Add project folder",
        handler: this.handleAddProject,
        preventDefault: true,
      },
      {
        key: "f",
        ctrlKey: true,
        description: "Focus file search",
        handler: this.handleFocusSearch,
        preventDefault: true,
      },
      {
        key: "Enter",
        ctrlKey: true,
        description: "Send message (in chat)",
        handler: this.handleSendMessage,
        preventDefault: true,
      },
      {
        key: "Escape",
        description: "Close preview/modal",
        handler: this.handleEscape,
        preventDefault: true,
      },
      {
        key: "/",
        ctrlKey: true,
        description: "Show keyboard shortcuts",
        handler: this.handleShowShortcuts,
        preventDefault: true,
      },
      // File operations
      {
        key: "r",
        ctrlKey: true,
        description: "Refresh current view",
        handler: this.handleRefresh,
        preventDefault: true,
      },
      {
        key: "c",
        ctrlKey: true,
        shiftKey: true,
        description: "Copy file path",
        handler: this.handleCopyPath,
        preventDefault: true,
      },
    ];
  }

  private bindEvents() {
    document.addEventListener("keydown", this.handleKeydown.bind(this));
  }

  private handleKeydown(event: KeyboardEvent) {
    if (!this.isEnabled) return;

    // Don't handle shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.contentEditable === "true"
    ) {
      // Allow Escape and some Ctrl shortcuts even in inputs
      if (event.key !== "Escape" && !event.ctrlKey) {
        return;
      }
    }

    const shortcut = this.shortcuts.find((s) => this.matchesShortcut(event, s));

    if (shortcut) {
      if (shortcut.preventDefault) {
        event.preventDefault();
      }
      shortcut.handler();
    }
  }

  private matchesShortcut(
    event: KeyboardEvent,
    shortcut: KeyboardShortcut,
  ): boolean {
    return (
      event.key === shortcut.key &&
      !!event.ctrlKey === !!shortcut.ctrlKey &&
      !!event.shiftKey === !!shortcut.shiftKey &&
      !!event.altKey === !!shortcut.altKey &&
      !!event.metaKey === !!shortcut.metaKey
    );
  }

  // Shortcut handlers
  private async handleNewChat() {
    const selected = get(selectedTreeNode);
    if (!selected) {
      showToast("Select a folder first", "warning");
      return;
    }

    try {
      await chatService.createEmptyChat(selected);
    } catch (error) {
      // Error handled by service
    }
  }

  private async handleAddProject() {
    const path = prompt("Enter project folder path:");
    if (!path) return;

    try {
      await projectService.addProjectFolder(path);
    } catch (error) {
      // Error handled by service
    }
  }

  private handleFocusSearch() {
    // Focus search input if it exists
    const searchInput = document.querySelector(
      "[data-search-input]",
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    } else {
      showToast("Search functionality coming soon", "info");
    }
  }

  private handleSendMessage() {
    // Trigger send message if in chat
    const sendButton = document.querySelector(
      "[data-send-button]",
    ) as HTMLButtonElement;
    if (sendButton && !sendButton.disabled) {
      sendButton.click();
    }
  }

  private handleEscape() {
    // Close preview if open
    const preview = get(selectedPreviewFile);
    if (preview) {
      selectedPreviewFile.set(null);
      return;
    }

    // Close any modals
    const modal = document.querySelector("[data-modal]");
    if (modal) {
      const closeButton = modal.querySelector(
        "[data-close]",
      ) as HTMLButtonElement;
      closeButton?.click();
    }
  }

  private handleShowShortcuts() {
    const shortcutList = this.shortcuts
      .map((s) => {
        const keys = [];
        if (s.ctrlKey) keys.push("Ctrl");
        if (s.shiftKey) keys.push("Shift");
        if (s.altKey) keys.push("Alt");
        if (s.metaKey) keys.push("Cmd");
        keys.push(s.key);
        return `${keys.join("+")} - ${s.description}`;
      })
      .join("\n");

    showToast(`Keyboard Shortcuts:\n${shortcutList}`, "info");
  }

  private handleRefresh() {
    // Refresh current view
    const refreshButton = document.querySelector(
      "[data-refresh]",
    ) as HTMLButtonElement;
    if (refreshButton) {
      refreshButton.click();
    } else {
      window.location.reload();
    }
  }

  private handleCopyPath() {
    const selected = get(selectedTreeNode);
    if (selected) {
      navigator.clipboard.writeText(selected);
      showToast(`Path copied: ${selected}`, "success");
    } else {
      showToast("No file selected", "warning");
    }
  }

  public enable() {
    this.isEnabled = true;
  }

  public disable() {
    this.isEnabled = false;
  }

  public addShortcut(shortcut: KeyboardShortcut) {
    this.shortcuts.push(shortcut);
  }

  public removeShortcut(key: string) {
    this.shortcuts = this.shortcuts.filter((s) => s.key !== key);
  }

  public getShortcuts() {
    return [...this.shortcuts];
  }

  public destroy() {
    document.removeEventListener("keydown", this.handleKeydown.bind(this));
  }
}

// Singleton instance
export const keyboardManager = new KeyboardManager();
