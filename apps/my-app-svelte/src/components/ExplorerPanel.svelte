<!-- apps/my-app-svelte/src/components/ExplorerPanel.svelte -->
<script lang="ts">
  import { projectFolders, folderTrees } from "../stores/project-store";
  import {
    expandedNodes,
    selectedTreeNode,
    toggleNodeExpansion,
    selectFile,
  } from "../stores/tree-store";
  import { connectionStates, isLoading, showToast } from "../stores/ui-store";
  import { tasksByPath } from "../stores/task-store";
  import { projectService } from "../services/project-service";
  import { chatService } from "../services/chat-service";
  import FileIcon from "./FileIcon.svelte";
  import {
    PlusLg,
    ChevronDown,
    ChevronRight,
    ThreeDotsVertical,
    ChatDots,
    FolderPlus,
    Copy,
    Trash,
    Pencil,
    StopFill,
    Gear,
  } from "svelte-bootstrap-icons";
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

  function handleCopyPath(path: string) {
    navigator.clipboard.writeText(path);
    showToast(`Path copied: ${path}`, "success");
  }

  function getTaskStatusConfig(status: string) {
    const configs = {
      COMPLETED: {
        label: "completed",
        className: "bg-green-600/20 text-green-400 border-green-600/40",
      },
      IN_PROGRESS: {
        label: "running",
        className: "bg-blue-600/20 text-blue-400 border-blue-600/40",
      },
      CREATED: {
        label: "created",
        className: "bg-yellow-600/20 text-yellow-400 border-yellow-600/40",
      },
      INITIALIZED: {
        label: "ready",
        className: "bg-purple-600/20 text-purple-400 border-purple-600/40",
      },
    };
    return configs[status as keyof typeof configs] || configs.CREATED;
  }

  function isTaskFolder(folderName: string): boolean {
    return folderName.startsWith("task-");
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
      disabled={$isLoading("addProjectFolder")}
      class="text-muted hover:text-accent p-1 disabled:opacity-50"
      title="Add Project"
    >
      <PlusLg class="text-base" />
    </button>
  </div>

  <!-- Tree Content -->
  <div class="flex-1 overflow-y-auto p-1">
    {#if $isLoading("projectFolders")}
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
          {#snippet renderTreeNode(node, level)}
            {@const isExpanded = $expandedNodes.has(node.path)}
            {@const isSelected = $selectedTreeNode === node.path}
            {@const task = $tasksByPath.get(node.path)}
            {@const isTaskDir = isTaskFolder(node.name)}

            <div>
              <!-- Node Row -->
              <div
                class="group flex min-h-[28px] cursor-pointer items-center rounded px-1 py-0.5 text-[13px] {isSelected
                  ? 'bg-selected text-foreground'
                  : 'hover:bg-hover text-foreground'}"
                style="padding-left: {level * 16 + 8}px"
                onclick={() => handleNodeClick(node)}
              >
                <!-- Expand/Collapse Arrow -->
                {#if node.isDirectory}
                  <div class="mr-1 h-4 w-4">
                    {#if isExpanded}
                      <ChevronDown class="text-muted text-sm" />
                    {:else}
                      <ChevronRight class="text-muted text-sm" />
                    {/if}
                  </div>
                {/if}

                <!-- File Icon -->
                <div class="mr-2">
                  <FileIcon
                    fileName={node.name}
                    isDirectory={node.isDirectory}
                    {isExpanded}
                  />
                </div>

                <!-- File Name -->
                <span class="flex-1 truncate text-sm">{node.name}</span>

                <!-- Task Status Badge -->
                {#if isTaskDir && task}
                  {@const statusConfig = getTaskStatusConfig(task.status)}
                  <span
                    class="ml-2 rounded border px-2 py-0.5 font-mono text-xs {statusConfig.className}"
                  >
                    {statusConfig.label}
                  </span>

                  {#if task.status === "IN_PROGRESS"}
                    <button
                      onclick={(e) => {
                        e.stopPropagation();
                        showToast(
                          "Stop task functionality coming soon",
                          "info",
                        );
                      }}
                      class="text-muted ml-1 opacity-0 hover:text-red-400 group-hover:opacity-100"
                      title="Stop Task"
                    >
                      <StopFill class="text-xs" />
                    </button>
                  {/if}
                {/if}

                <!-- Actions -->
                <div class="flex items-center">
                  <!-- New Chat Button for Directories -->
                  {#if node.isDirectory}
                    <button
                      onclick={(e) => {
                        e.stopPropagation();
                        handleNewChat(node.path);
                      }}
                      disabled={$isLoading("createChat")}
                      class="hover:bg-hover mr-1 cursor-pointer rounded p-1 opacity-0 group-hover:opacity-100 disabled:opacity-30"
                      title="New Chat"
                    >
                      <ChatDots class="text-muted hover:text-accent text-xs" />
                    </button>
                  {/if}

                  <!-- Context Menu Button -->
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      showToast(
                        "Context menu functionality coming soon",
                        "info",
                      );
                    }}
                    class="hover:bg-hover cursor-pointer rounded p-1 opacity-0 group-hover:opacity-100"
                    title="More options"
                  >
                    <ThreeDotsVertical class="text-muted text-xs" />
                  </button>
                </div>
              </div>

              <!-- Children -->
              {#if node.isDirectory && isExpanded && node.children}
                {#each node.children as child (child.path)}
                  {@render renderTreeNode(child, level + 1)}
                {/each}
              {/if}
            </div>
          {/snippet}

          {@render renderTreeNode(tree, 0)}
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
