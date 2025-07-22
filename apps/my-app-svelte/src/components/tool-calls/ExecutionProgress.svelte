<!-- src/components/ExecutionProgress.svelte -->
<script lang="ts">
  import type { ToolCall } from '../../types/tool-call.types';
  import { PlayFill, Terminal } from 'svelte-bootstrap-icons';

  interface Props {
    toolCall: ToolCall;
  }

  const { toolCall }: Props = $props();

  // Calculate elapsed time
  const elapsedTime = $derived(() => {
    if (toolCall.startTime) {
      const elapsed = Date.now() - toolCall.startTime;
      if (elapsed < 1000) {
        return `${elapsed}ms`;
      } else {
        return `${(elapsed / 1000).toFixed(1)}s`;
      }
    }
    return null;
  });
</script>

<div class="bg-blue-100 rounded-md p-3 mt-3 space-y-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <PlayFill class="w-4 h-4 text-blue-600" />
      <span class="text-sm font-medium text-blue-800">Executing...</span>
    </div>
    {#if elapsedTime()}
      <span class="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded">{elapsedTime()}</span>
    {/if}
  </div>

  <!-- Progress bar animation -->
  <div class="w-full">
    <div class="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
      <div class="progress-bar-fill h-full bg-blue-500 animate-pulse"></div>
    </div>
  </div>

  <!-- Live output display -->
  {#if toolCall.liveOutput}
    <div class="bg-white border border-blue-200 rounded">
      <div class="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-200">
        <Terminal class="w-4 h-4" />
        <span class="text-sm font-medium text-blue-800">Live Output</span>
      </div>
      <div class="max-h-40 overflow-y-auto">
        <pre class="p-3 text-xs font-mono text-gray-800 whitespace-pre-wrap">{toolCall.liveOutput}</pre>
      </div>
    </div>
  {/if}
</div>

<style>
  .progress-bar-fill {
    background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%);
    animation: progress-sweep 2s ease-in-out infinite;
  }

  @keyframes progress-sweep {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(0%); }
    100% { transform: translateX(100%); }
  }
</style>