<!-- src/components/ToolCallItem.svelte -->
<script lang="ts">
  import type { ToolCall } from '../../types/tool-call.types';
  import PermissionConfirmation from './PermissionConfirmation.svelte';
  import ExecutionProgress from './ExecutionProgress.svelte';
  import ResultDisplay from './ResultDisplay.svelte';
  import StatusIcon from './StatusIcon.svelte';

  interface Props {
    toolCall: ToolCall;
    onApprove: () => void;
    onDeny: () => void;
    onRetry: () => void;
  }

  const { toolCall, onApprove, onDeny, onRetry }: Props = $props();

  // Format arguments for display
  const formattedArgs = $derived(() => {
    if (!toolCall.request.args || Object.keys(toolCall.request.args).length === 0) {
      return null;
    }
    
    try {
      return JSON.stringify(toolCall.request.args, null, 2);
    } catch {
      return String(toolCall.request.args);
    }
  });

  // Calculate execution duration
  const durationText = $derived(() => {
    if (toolCall.durationMs) {
      if (toolCall.durationMs < 1000) {
        return `${toolCall.durationMs}ms`;
      } else {
        return `${(toolCall.durationMs / 1000).toFixed(1)}s`;
      }
    }
    
    if (toolCall.startTime && (toolCall.status === 'executing' || toolCall.status === 'validating')) {
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

<div class="border p-3 mb-2">
  <!-- Tool basic information -->
  <div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-2">
      <span class="font-medium text-foreground">{toolCall.request.name}</span>
      {#if durationText()}
        <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{durationText()}</span>
      {/if}
    </div>
    <StatusIcon status={toolCall.status} />
  </div>

  <!-- Tool arguments (collapsible) -->
  {#if formattedArgs()}
    <details class="mb-3 border border-gray-200 rounded">
      <summary class="px-3 py-2 bg-gray-50 cursor-pointer text-sm font-medium hover:bg-gray-100">Arguments</summary>
      <pre class="p-3 text-xs font-mono bg-white overflow-x-auto">{formattedArgs()}</pre>
    </details>
  {/if}

  <!-- Permission confirmation area -->
  {#if toolCall.status === 'awaiting_approval' && toolCall.confirmationDetails}
    <PermissionConfirmation
      confirmationDetails={toolCall.confirmationDetails}
      {onApprove}
      {onDeny}
    />
  {/if}

  <!-- Execution progress -->
  {#if toolCall.status === 'executing'}
    <ExecutionProgress {toolCall} />
  {/if}

  <!-- Validating status -->
  {#if toolCall.status === 'validating'}
    <div class="flex items-center gap-2 p-2 bg-yellow-100 rounded text-sm">
      <div class="w-4 h-4 border-2 border-yellow-300 border-t-yellow-600 rounded-full animate-spin"></div>
      <span>Validating tool call...</span>
    </div>
  {/if}

  <!-- Scheduled status -->
  {#if toolCall.status === 'scheduled'}
    <div class="p-2 bg-blue-100 rounded text-sm text-blue-700">
      <span>Scheduled for execution...</span>
    </div>
  {/if}

  <!-- Result display -->
  {#if toolCall.status === 'success' || toolCall.status === 'error' || toolCall.status === 'cancelled'}
    <ResultDisplay {toolCall} {onRetry} />
  {/if}
</div>