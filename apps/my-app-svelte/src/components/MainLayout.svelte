<!-- apps/my-app-svelte/src/components/MainLayout.svelte -->
<script lang="ts">
  import { Logger } from "tslog";
  import ExplorerPanel from "./file-explorer/ExplorerPanel.svelte";
  import ChatPanel from "./ChatPanel.svelte";
  import RightPanel from "./RightPanel.svelte";
  import { projectService } from "../services/project-service";
  import { taskService } from "../services/task-service";

  const logger = new Logger({ name: "MainLayout" });

  // Use $effect instead of onMount for Svelte 5
  $effect(() => {
    async function initializeData() {
      logger.info("MainLayout mounted, initializing app data...");

      try {
        // Initialize core application data
        await Promise.all([
          projectService.loadProjectFolders(),
          taskService.getAllTasks(),
        ]);

        logger.info("App data initialization complete");
      } catch (error) {
        logger.error("Failed to initialize app data:", error);
      }
    }

    initializeData();
  });
</script>

<div class="h-screen flex bg-background text-foreground font-sans">
  <!-- Left Panel: File Explorer -->
  <ExplorerPanel />

  <!-- Center Panel: Chat Interface -->
  <ChatPanel />

  <!-- Right Panel: Controls & Preview -->
  <RightPanel />
</div>
