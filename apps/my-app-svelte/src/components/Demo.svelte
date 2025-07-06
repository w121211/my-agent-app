<!-- apps/my-app-svelte/src/components/Demo.svelte -->
<script lang="ts">
  import { Logger } from "tslog";
  import {
    projectFolders,
    hasAnyProjectFolders,
  } from "../stores/project-store";
  import { currentChat, hasCurrentChat } from "../stores/chat-store";
  import { tasks, taskCount } from "../stores/task-store";
  import {
    loadingStates,
    toasts,
    connectionStates,
    showToast,
  } from "../stores/ui-store";
  import { chatService } from "../services/chat-service";
  import { projectService } from "../services/project-service";
  import { taskService } from "../services/task-service";

  const logger = new Logger({ name: "Demo" });

  // Use $effect instead of onMount for Svelte 5
  $effect(() => {
    logger.info("Demo component mounted");
  });

  // Example of using services and stores together
  async function handleCreateTestProject() {
    try {
      const testPath = "/tmp/test-project";
      await projectService.addProjectFolder(testPath);
      logger.info("Test project created");
    } catch (error) {
      logger.error("Failed to create test project:", error);
    }
  }

  async function handleCreateTestChat() {
    if ($projectFolders.length === 0) {
      showToast("No project folders available", "warning");
      return;
    }

    try {
      const firstProject = $projectFolders[0];
      await chatService.createEmptyChat(firstProject.path);
      logger.info("Test chat created");
    } catch (error) {
      logger.error("Failed to create test chat:", error);
    }
  }

  async function handleLoadTasks() {
    try {
      await taskService.getAllTasks();
      logger.info("Tasks loaded");
    } catch (error) {
      logger.error("Failed to load tasks:", error);
    }
  }
</script>

<div class="p-6 bg-background text-foreground">
  <h1 class="text-2xl font-bold mb-6">Svelte 5 Migration Demo</h1>

  <!-- Store State Display -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div class="bg-surface rounded-lg p-4 border border-border">
      <h3 class="text-accent font-semibold mb-2">Project State</h3>
      <p class="text-sm text-muted">
        Projects: {$projectFolders.length}
        <br />
        Has Projects: {$hasAnyProjectFolders ? "Yes" : "No"}
      </p>
    </div>

    <div class="bg-surface rounded-lg p-4 border border-border">
      <h3 class="text-accent font-semibold mb-2">Chat State</h3>
      <p class="text-sm text-muted">
        Current Chat: {$hasCurrentChat
          ? $currentChat?.id.slice(0, 8) + "..."
          : "None"}
        <br />
        Has Chat: {$hasCurrentChat ? "Yes" : "No"}
      </p>
    </div>

    <div class="bg-surface rounded-lg p-4 border border-border">
      <h3 class="text-accent font-semibold mb-2">Task State</h3>
      <p class="text-sm text-muted">
        Task Count: {$taskCount}
        <br />
        Tasks Loaded: {$tasks.length > 0 ? "Yes" : "No"}
      </p>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="flex flex-wrap gap-3 mb-6">
    <button
      onclick={handleCreateTestProject}
      disabled={$loadingStates.addProjectFolder}
      class="bg-accent hover:bg-accent/80 disabled:opacity-50 px-4 py-2 rounded text-white text-sm font-medium"
    >
      {$loadingStates.addProjectFolder ? "Creating..." : "Create Test Project"}
    </button>

    <button
      onclick={handleCreateTestChat}
      disabled={$loadingStates.createChat || !$hasAnyProjectFolders}
      class="bg-accent hover:bg-accent/80 disabled:opacity-50 px-4 py-2 rounded text-white text-sm font-medium"
    >
      {$loadingStates.createChat ? "Creating..." : "Create Test Chat"}
    </button>

    <button
      onclick={handleLoadTasks}
      disabled={$loadingStates.loadTasks}
      class="bg-accent hover:bg-accent/80 disabled:opacity-50 px-4 py-2 rounded text-white text-sm font-medium"
    >
      {$loadingStates.loadTasks ? "Loading..." : "Load Tasks"}
    </button>

    <button
      onclick={() => showToast("Test notification!", "info")}
      class="bg-surface hover:bg-hover border border-border px-4 py-2 rounded text-foreground text-sm font-medium"
    >
      Test Toast
    </button>
  </div>

  <!-- Connection Status -->
  <div class="bg-surface rounded-lg p-4 border border-border mb-6">
    <h3 class="text-accent font-semibold mb-3">Connection Status</h3>
    <div class="grid grid-cols-2 gap-2 text-sm">
      {#each Object.entries($connectionStates) as [name, state]}
        <div class="flex items-center">
          <div
            class="w-2 h-2 rounded-full mr-2 {state === 'connected'
              ? 'bg-green-500'
              : state === 'connecting'
                ? 'bg-yellow-500'
                : state === 'error'
                  ? 'bg-red-500'
                  : 'bg-muted'}"
          ></div>
          <span class="text-muted">{name}: {state}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Active Toasts Count -->
  {#if $toasts.length > 0}
    <div
      class="bg-blue-600/20 border border-blue-600/40 rounded-lg p-3 text-blue-400 text-sm"
    >
      Active Notifications: {$toasts.length}
    </div>
  {/if}

  <!-- Implementation Status -->
  <div class="mt-8 text-muted text-sm">
    <h4 class="font-semibold mb-2">Implementation Status:</h4>
    <ul class="space-y-1">
      <li>✅ Part 1: Project Setup + Core Infrastructure</li>
      <li>✅ Part 2: Service Layer (Business Logic + tRPC)</li>
      <li>✅ Part 3: Store Layer (State Management)</li>
      <li>✅ Part 4: Store Refactoring (Split project/tree stores)</li>
      <li>🔄 Part 5: Component Layer (Full UI Implementation)</li>
    </ul>
  </div>
</div>
