<!-- apps/my-app-svelte/src/components/MainLayoutDemo.svelte -->
<script lang="ts">
  import { Logger } from "tslog";
  import ChatPanelDemo from "./ChatPanelDemo.svelte";

  const logger = new Logger({ name: "MainLayoutDemo" });

  logger.info("MainLayoutDemo mounted - showing tool call demo");
</script>

<div class="h-screen flex bg-background text-foreground font-sans">
  <!-- Left Panel: Placeholder -->
  <div class="w-80 bg-surface border-r border-border flex flex-col items-center justify-center">
    <div class="text-center p-6">
      <div class="text-4xl mb-4">🛠️</div>
      <h3 class="text-lg font-semibold text-foreground mb-2">Tool Call Demo</h3>
      <p class="text-sm text-muted">
        This demo shows how tool calls appear in the chat interface with different execution states.
      </p>
      <div class="mt-4 space-y-2 text-xs text-muted">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 bg-orange-500 rounded-full"></span>
          <span>Awaiting Approval</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          <span>Executing</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 bg-green-500 rounded-full"></span>
          <span>Success</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Center Panel: Chat Demo -->
  <ChatPanelDemo />

  <!-- Right Panel: Placeholder -->
  <div class="w-80 bg-surface border-l border-border flex flex-col items-center justify-center">
    <div class="text-center p-6">
      <div class="text-4xl mb-4">📊</div>
      <h3 class="text-lg font-semibold text-foreground mb-2">Tool States</h3>
      <p class="text-sm text-muted mb-4">
        Monitor tool execution progress and results in real-time.
      </p>
      <div class="space-y-3 text-xs">
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div class="font-medium text-orange-800">Approval Required</div>
          <div class="text-orange-600 mt-1">File write operations need confirmation</div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div class="font-medium text-blue-800">Executing Tests</div>
          <div class="text-blue-600 mt-1">Running test suite with live output</div>
        </div>
        <div class="bg-green-50 border border-green-200 rounded-lg p-3">
          <div class="font-medium text-green-800">Calculator Complete</div>
          <div class="text-green-600 mt-1">Mathematical operation finished</div>
        </div>
      </div>
    </div>
  </div>
</div>