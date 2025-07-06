<!-- apps/my-app-svelte/src/components/ExplorerPanel.svelte -->
<script lang="ts">
  import { projectFolders, folderTrees } from "../stores/project-store";
  import { toggleNodeExpansion, selectFile } from "../stores/tree-store";
  import { connectionStates, isLoadingAddProjectFolder, isLoadingProjectFolders, isLoadingCreateChat, showToast } from "../stores/ui-store";
  import { projectService } from "../services/project-service";
  import { chatService } from "../services/chat-service";
  import TreeNode from "./TreeNode.svelte";
  import FileIcon from "./FileIcon.svelte";
  import { PlusLg, Gear } from "svelte-bootstrap-icons";
  import { Logger } from "tslog";

  const logger = new Logger({ name: "ExplorerPanel" });

  async function handleAddProjectFolder() {
    const folderPath = prompt("Enter project folder path:");
    if (!folderPath) return;

    try {
      await projectService.addProjectFolder(folderPath);
    } catch (error) {
      // Error handling done in service
    }
  }

  async function handleNewChat(targetPath: string) {
    try {
      await chatService.createEmptyChat(targetPath);
    } catch (error) {
      // Error handling done in service
    }
  }

  function handleNodeClick(node: any) {
    if (node.isDirectory) {
      toggleNodeExpansion(node.path);
    } else {
      selectFile(node.path);
    }
  }

  function handleContextMenu(path: string) {
    showToast("Context menu functionality coming soon", "info");
  }

  function handleStopTask(path: string) {
    showToast("Stop task functionality coming soon", "info");
  }
</script>

<div class="bg-surface border-border flex h-full w-64 flex-col border-r">
  <!-- Header -->
  <div class="border-border flex items-center justify-between border-b p-3">
    <span class="text-muted text-xs font-semibold uppercase tracking-wide">
      Projects
    </span>
    <button
      onclick={handleAddProjectFolder}
      disabled={$isLoadingAddProjectFolder}
      class="text-muted hover:text-accent p-1 disabled:opacity-50"
      title="Add Project"
    >
      <PlusLg class="text-base" />
    </button>
  </div>

  <!-- Tree Content -->
  <div class="flex-1 overflow-y-auto p-1">
    {#if $isLoadingProjectFolders}
      <div class="text-muted p-4 text-sm">Loading project folders...</div>
    {:else if $projectFolders.length === 0}
      <div class="text-muted text-center p-4 text-sm">
        <FileIcon
          fileName=""
          isDirectory={true}
          size="text-3xl"
          className="mx-auto mb-2"
        />
        <p>No project folders</p>
        <p class="text-xs mt-1">Add a project folder to get started</p>
      </div>
    {:else}
      {#each $projectFolders as folder (folder.id)}
        {@const tree = $folderTrees[folder.id]}
        {#if tree}
          <TreeNode
            node={tree}
            level={0}
            isCreatingChat={$isLoadingCreateChat}
            onclick={handleNodeClick}
            onNewChat={handleNewChat}
            onContextMenu={handleContextMenu}
            onStopTask={handleStopTask}
          />
        {/if}
      {/each}
    {/if}
  </div>

  <!-- Connection Status -->
  <div class="border-border border-t p-3">
    <div class="text-muted space-y-1 text-xs">
      <div class="flex items-center">
        <div
          class="mr-2 h-2 w-2 rounded-full {$connectionStates.fileWatcher ===
          'connected'
            ? 'bg-green-500'
            : $connectionStates.fileWatcher === 'connecting'
              ? 'bg-yellow-500'
              : $connectionStates.fileWatcher === 'error'
                ? 'bg-red-500'
                : 'bg-muted'}"
        ></div>
        File watcher: {$connectionStates.fileWatcher}
      </div>
      <div class="flex items-center">
        <div
          class="mr-2 h-2 w-2 rounded-full {$connectionStates.taskEvents ===
          'connected'
            ? 'bg-green-500'
            : $connectionStates.taskEvents === 'connecting'
              ? 'bg-yellow-500'
              : $connectionStates.taskEvents === 'error'
                ? 'bg-red-500'
                : 'bg-muted'}"
        ></div>
        Task events: {$connectionStates.taskEvents}
      </div>
    </div>
  </div>

  <!-- Settings -->
  <div class="border-border border-t p-3">
    <button
      onclick={() => showToast("Settings functionality coming soon", "info")}
      class="text-muted hover:text-accent flex w-full items-center justify-center px-3 py-2 text-xs font-medium"
    >
      <Gear class="mr-2 text-sm" />
      Settings
    </button>
  </div>
</div>
