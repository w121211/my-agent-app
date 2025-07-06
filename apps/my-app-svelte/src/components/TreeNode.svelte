<!-- apps/my-app-svelte/src/components/TreeNode.svelte -->
<script lang="ts">
  import type { FolderTreeNode } from "../stores/project-store";
  import type { Task } from "../services/task-service";
  import { expandedNodes, selectedTreeNode } from "../stores/tree-store";
  import { tasksByPath } from "../stores/task-store";
  import TreeNode from "./TreeNode.svelte";
  import FileIcon from "./FileIcon.svelte";
  import {
    ChevronDown,
    ChevronRight,
    ThreeDotsVertical,
    ChatDots,
    StopFill,
  } from "svelte-bootstrap-icons";

  interface TreeNodeProps {
    node: FolderTreeNode;
    level: number;
    isCreatingChat?: boolean;
    onclick: (node: FolderTreeNode) => void;
    onNewChat: (path: string) => void;
    onContextMenu: (path: string) => void;
    onStopTask?: (path: string) => void;
  }

  let {
    node,
    level,
    isCreatingChat = false,
    onclick,
    onNewChat,
    onContextMenu,
    onStopTask,
  }: TreeNodeProps = $props();

  // Computed values from stores
  const isExpanded = $derived($expandedNodes.has(node.path));
  const isSelected = $derived($selectedTreeNode === node.path);
  const task = $derived($tasksByPath.get(node.path));
  const isTaskDir = $derived(isTaskFolder(node.name));

  function handleNodeClick() {
    onclick(node);
  }

  function handleNewChat(e: MouseEvent) {
    e.stopPropagation();
    onNewChat(node.path);
  }

  function handleContextMenu(e: MouseEvent) {
    e.stopPropagation();
    onContextMenu(node.path);
  }

  function handleStopTask(e: MouseEvent) {
    e.stopPropagation();
    if (onStopTask) {
      onStopTask(node.path);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleNodeClick();
    }
  }

  function isTaskFolder(folderName: string): boolean {
    return folderName.startsWith("task-");
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
</script>

<div>
  <!-- Node Row -->
  <div
    role="button"
    tabindex="0"
    class="group flex min-h-[28px] w-full cursor-pointer items-center rounded px-1 py-0.5 text-[13px] {isSelected
      ? 'bg-selected text-foreground'
      : 'hover:bg-hover text-foreground'}"
    style="padding-left: {level * 16 + 8}px"
    onclick={handleNodeClick}
    onkeydown={handleKeydown}
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

      {#if task.status === "IN_PROGRESS" && onStopTask}
        <button
          onclick={handleStopTask}
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
          onclick={handleNewChat}
          disabled={isCreatingChat}
          class="hover:bg-hover mr-1 cursor-pointer rounded p-1 opacity-0 group-hover:opacity-100 disabled:opacity-30"
          title="New Chat"
        >
          <ChatDots class="text-muted hover:text-accent text-xs" />
        </button>
      {/if}

      <!-- Context Menu Button -->
      <button
        onclick={handleContextMenu}
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
      <TreeNode
        node={child}
        level={level + 1}
        {isCreatingChat}
        {onclick}
        {onNewChat}
        {onContextMenu}
        {onStopTask}
      />
    {/each}
  {/if}
</div>
