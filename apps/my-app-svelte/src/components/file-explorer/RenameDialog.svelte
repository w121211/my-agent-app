<!-- apps/my-app-svelte/src/components/file-explorer/RenameDialog.svelte -->
<script lang="ts">
  import { fileExplorerService } from "../../services/file-explorer-service";
  import { renameDialog, closeRenameDialog } from "../../stores/file-explorer-store.svelte";

  let inputValue = $state($renameDialog.currentName);
  let inputElement = $state<HTMLInputElement>();

  function handleSubmit() {
    const newName = inputValue.trim();
    if (newName && newName !== $renameDialog.currentName) {
      fileExplorerService.handleRename($renameDialog.targetPath, newName);
    } else {
      closeRenameDialog();
    }
  }

  function handleCancel() {
    inputValue = $renameDialog.currentName;
    closeRenameDialog();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if ($renameDialog.isVisible && !(event.target as Element).closest('.rename-dialog')) {
      handleCancel();
    }
  }

  $effect(() => {
    console.log("🎯 RenameDialog $effect triggered, isVisible:", $renameDialog.isVisible, "currentName:", $renameDialog.currentName);
    if ($renameDialog.isVisible) {
      inputValue = $renameDialog.currentName;
      document.addEventListener('click', handleClickOutside);
      
      // Focus and select text after a small delay to ensure DOM is ready
      setTimeout(() => {
        if (inputElement) {
          inputElement.focus();
          inputElement.select();
        }
      }, 10);
      
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  });
</script>

{#if $renameDialog.isVisible}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
    <div class="rename-dialog bg-surface border-border w-80 rounded-lg border p-4 shadow-xl">
      <h3 class="text-foreground mb-3 text-lg font-semibold">Rename</h3>
      
      <div class="mb-4">
        <label for="rename-input" class="text-muted mb-2 block text-sm">
          New name:
        </label>
        <input
          id="rename-input"
          bind:this={inputElement}
          bind:value={inputValue}
          onkeydown={handleKeydown}
          class="text-foreground bg-input-background border-input-border focus:border-accent w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent/50"
          type="text"
          placeholder="Enter new name"
        />
      </div>
      
      <div class="flex justify-end gap-2">
        <button
          onclick={handleCancel}
          class="text-muted hover:text-foreground border-input-border hover:border-muted rounded border px-3 py-1.5 text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={handleSubmit}
          disabled={!inputValue.trim() || inputValue.trim() === $renameDialog.currentName}
          class="bg-accent hover:bg-accent/80 disabled:bg-muted disabled:text-muted rounded px-3 py-1.5 text-sm text-white transition-colors disabled:cursor-not-allowed"
        >
          Rename
        </button>
      </div>
    </div>
  </div>
{/if}