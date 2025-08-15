// apps/my-app-svelte/src/services/file-search-service.ts
import { Logger } from "tslog";
import { trpcClient } from "../lib/trpc-client";
import { projectState } from "../stores/project-store.svelte.js";
import { treeState } from "../stores/tree-store.svelte.js";
import {
  fileSearchState,
  setSearchResults,
  setShowMenu,
  setSearching,
  setSearchQuery,
  setCursorPosition,
  setSearchStartPosition,
  moveSelectionUp,
  moveSelectionDown,
  resetSearch,
  type FileSearchResult,
} from "../stores/file-search-store.svelte.js";

class FileSearchService {
  private logger = new Logger({ name: "FileSearchService" });

  /**
   * Search files within a project folder
   */
  async searchFiles(query: string, projectId?: string, limit: number = 10) {
    try {
      this.logger.debug("Searching files:", { query, projectId, limit });
      
      // Use the provided projectId or find the selected project folder
      let targetProjectId = projectId;
      
      if (!targetProjectId) {
        // Find selected project folder based on current tree selection
        const selectedNode = treeState.selectedNode;
        if (selectedNode) {
          const selectedProject = projectState.projectFolders.find(
            (folder) =>
              selectedNode === folder.path ||
              selectedNode.startsWith(folder.path + "/"),
          );
          targetProjectId = selectedProject?.id;
        }
        
        // Fallback to first project folder if no selection
        if (!targetProjectId && projectState.projectFolders.length > 0) {
          targetProjectId = projectState.projectFolders[0].id;
        }
      }
      
      if (!targetProjectId) {
        this.logger.warn("No project folder available for search");
        return [];
      }

      const results = await trpcClient.projectFolder.searchFiles.query({
        query: query || "", // Show all files if query is empty
        projectId: targetProjectId,
        limit,
      });

      this.logger.debug(`Found ${results.length} search results`);
      return results;
    } catch (error) {
      this.logger.error("File search failed:", error);
      throw error;
    }
  }

  // File search methods for chat panel
  async performFileSearch(query: string, projectId?: string, limit: number = 20): Promise<void> {
    setSearching(true);
    
    try {
      const results = await this.searchFiles(query, projectId, limit);
      setSearchResults(results);
    } catch (error) {
      this.logger.error("File search failed:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  detectFileReference(inputValue: string, inputElement: HTMLTextAreaElement | null): void {
    if (!inputElement) return;

    const cursorPos = inputElement.selectionStart || 0;
    const beforeCursor = inputValue.substring(0, cursorPos);
    const atMatch = beforeCursor.match(/@([^@\s]*)$/);

    if (atMatch) {
      const query = atMatch[1] || "";
      const searchStart = cursorPos - atMatch[1].length;
      
      setSearchQuery(query);
      setCursorPosition(cursorPos);
      setSearchStartPosition(searchStart);
      setShowMenu(true);
      
      this.performFileSearch(query);
    } else {
      setShowMenu(false);
    }
  }

  handleFileSelect(file: FileSearchResult, inputElement: HTMLTextAreaElement | null, currentInput: string): void {
    if (!inputElement) return;

    const searchStart = fileSearchState.searchStartPosition;
    const searchEnd = fileSearchState.cursorPosition;
    
    // Replace @query with file reference
    const beforeSearch = currentInput.substring(0, searchStart - 1); // -1 to remove @
    const afterSearch = currentInput.substring(searchEnd);
    const fileReference = `#${file.relativePath}`;
    
    const newValue = beforeSearch + fileReference + afterSearch;
    
    // Update input value and cursor position
    inputElement.value = newValue;
    const newCursorPos = beforeSearch.length + fileReference.length;
    inputElement.setSelectionRange(newCursorPos, newCursorPos);
    
    // Trigger input event to update store
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    
    setShowMenu(false);
    inputElement.focus();
  }

  handleSearchCancel(inputElement: HTMLTextAreaElement | null): void {
    setShowMenu(false);
    if (inputElement) {
      inputElement.focus();
    }
  }

  handleSearchHover(index: number): void {
    fileSearchState.selectedIndex = index;
  }

  handleSearchKeydown(
    event: KeyboardEvent,
    inputElement: HTMLTextAreaElement | null,
    currentInput: string
  ): boolean {
    if (!fileSearchState.showMenu) return false;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        moveSelectionUp();
        return true;
      
      case "ArrowDown":
        event.preventDefault();
        moveSelectionDown();
        return true;
      
      case "Enter":
      case "Tab":
        event.preventDefault();
        const selectedFile = fileSearchState.selectedIndex >= 0 && fileSearchState.selectedIndex < fileSearchState.results.length
          ? fileSearchState.results[fileSearchState.selectedIndex]
          : null;
        if (selectedFile) {
          this.handleFileSelect(selectedFile, inputElement, currentInput);
        }
        return true;
      
      case "Escape":
        event.preventDefault();
        this.handleSearchCancel(inputElement);
        return true;
      
      default:
        return false;
    }
  }

  cleanup(): void {
    resetSearch();
  }
}

export const fileSearchService = new FileSearchService();