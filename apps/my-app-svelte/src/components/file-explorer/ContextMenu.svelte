<!-- apps/my-app-svelte/src/components/file-explorer/ContextMenu.svelte -->
<script lang="ts">
  import { Link45deg, Pencil, Files, Trash } from "svelte-bootstrap-icons";
  import { fileExplorerService } from "../../services/file-explorer-service";
  import {
    fileExplorerState,
    closeContextMenu,
  } from "../../stores/file-explorer-store.svelte";

  function handleAction(action: string) {
    console.log("🎯 ContextMenu handleAction called with action:", action);
    fileExplorerService.handleFileAction(action, fileExplorerState.contextMenu.targetPath);
  }

  function handleClickOutside(event: MouseEvent) {
    if (
      fileExplorerState.contextMenu.isVisible &&
      !(event.target as Element).closest(".context-menu")
    ) {
      closeContextMenu();
    }
  }

  $effect(() => {
    if (fileExplorerState.contextMenu.isVisible) {
      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }
  });
</script>

{#if fileExplorerState.contextMenu.isVisible}
  <div
    class="context-menu bg-panel border-border fixed z-50 w-48 rounded-md border py-1 shadow-lg"
    style="left: {fileExplorerState.contextMenu.x}px; top: {fileExplorerState.contextMenu.y}px;"
  >
    <!-- Add to current chat -->
    <button
      class="w-full text-left text-foreground hover:bg-hover flex cursor-pointer items-center px-3 py-1.5 text-sm"
      onclick={(e) => {
        e.stopPropagation();
        handleAction("add-to-chat");
      }}
      tabindex="0"
    >
      <span class="text-muted mr-2 text-xs">@</span>
      <span>Add to current chat</span>
    </button>

    <!-- Add to project context -->
    <button
      class="w-full text-left text-foreground hover:bg-hover flex cursor-pointer items-center px-3 py-1.5 text-sm"
      onclick={(e) => {
        e.stopPropagation();
        handleAction("add-to-project");
      }}
      tabindex="0"
    >
      <span class="text-muted mr-2 text-xs">@</span>
      <span>Add to project context</span>
    </button>

    <!-- Copy reference -->
    <button
      class="w-full text-left text-foreground hover:bg-hover flex cursor-pointer items-center px-3 py-1.5 text-sm"
      onclick={(e) => {
        e.stopPropagation();
        handleAction("copy-reference");
      }}
      tabindex="0"
    >
      <Link45deg class="text-muted mr-2 text-xs" />
      <span>Copy reference</span>
    </button>

    <!-- Separator -->
    <div class="bg-border mx-2 my-1 h-px"></div>

    <!-- Rename -->
    <button
      class="w-full text-left text-foreground hover:bg-hover flex cursor-pointer items-center px-3 py-1.5 text-sm"
      onclick={(e) => {
        e.stopPropagation();
        handleAction("rename");
      }}
      tabindex="0"
    >
      <Pencil class="text-muted mr-2 text-xs" />
      <span>Rename</span>
    </button>

    <!-- Duplicate -->
    <button
      class="w-full text-left text-foreground hover:bg-hover flex cursor-pointer items-center px-3 py-1.5 text-sm"
      onclick={(e) => {
        e.stopPropagation();
        handleAction("duplicate");
      }}
      tabindex="0"
    >
      <Files class="text-muted mr-2 text-xs" />
      <span>Duplicate</span>
    </button>

    <!-- Delete -->
    <button
      class="w-full text-left text-foreground hover:bg-hover flex cursor-pointer items-center px-3 py-1.5 text-sm"
      onclick={(e) => {
        e.stopPropagation();
        handleAction("delete");
      }}
      tabindex="0"
    >
      <Trash class="text-muted mr-2 text-xs" />
      <span>Delete</span>
    </button>
  </div>
{/if}

<style>
  .context-menu {
    /* box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.3),
      0 4px 6px -2px rgba(0, 0, 0, 0.2); */
    z-index: 1000;
  }
</style>
