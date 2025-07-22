<!-- src/components/ResultDisplay.svelte -->
<script lang="ts">
  import type { ToolCall } from '../../types/tool-call.types';
  import { CheckCircle, XCircle, StopCircle, ArrowClockwise } from 'svelte-bootstrap-icons';

  interface Props {
    toolCall: ToolCall;
    onRetry: () => void;
  }

  const { toolCall, onRetry }: Props = $props();

  // Format the result or error for display
  const formattedOutput = $derived(() => {
    if (toolCall.status === 'success' && toolCall.response?.result) {
      try {
        if (typeof toolCall.response.result === 'string') {
          return toolCall.response.result;
        }
        return JSON.stringify(toolCall.response.result, null, 2);
      } catch {
        return String(toolCall.response.result);
      }
    }
    
    if ((toolCall.status === 'error' || toolCall.status === 'cancelled') && toolCall.response?.error) {
      return toolCall.response.error;
    }
    
    return 'No output available';
  });

  // Get appropriate icon and styling
  const statusConfig = $derived(() => {
    switch (toolCall.status) {
      case 'success':
        return {
          icon: CheckCircle,
          title: 'Success',
          containerClass: 'bg-green-50 border-green-200',
          iconClass: 'text-green-600',
          showRetry: false
        };
      case 'error':
        return {
          icon: XCircle,
          title: 'Error',
          containerClass: 'bg-red-50 border-red-200',
          iconClass: 'text-red-600',
          showRetry: true
        };
      case 'cancelled':
        return {
          icon: StopCircle,
          title: 'Cancelled',
          containerClass: 'bg-gray-50 border-gray-200',
          iconClass: 'text-gray-600',
          showRetry: false
        };
      default:
        return {
          icon: XCircle,
          title: 'Unknown',
          containerClass: 'bg-gray-50 border-gray-200',
          iconClass: 'text-gray-600',
          showRetry: false
        };
    }
  });

  // Format timestamp
  const timestampText = $derived(() => {
    if (toolCall.response?.timestamp) {
      return new Date(toolCall.response.timestamp).toLocaleTimeString();
    }
    return null;
  });
</script>

<div class="rounded-md p-3 mt-3 border {statusConfig().containerClass}">
  <div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-2">
      {#if statusConfig().icon}
        {@const StatusIcon = statusConfig().icon}
        <StatusIcon class="w-4 h-4 {statusConfig().iconClass}" />
      {/if}
      <span class="font-medium text-foreground">{statusConfig().title}</span>
      {#if timestampText()}
        <span class="text-xs text-muted bg-surface px-2 py-1 rounded">{timestampText()}</span>
      {/if}
      {#if toolCall.durationMs}
        <span class="text-xs text-muted bg-surface px-2 py-1 rounded">
          {toolCall.durationMs < 1000 ? `${toolCall.durationMs}ms` : `${(toolCall.durationMs / 1000).toFixed(1)}s`}
        </span>
      {/if}
    </div>
    
    {#if statusConfig().showRetry}
      <button
        class="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        onclick={onRetry}
        title="Retry tool call"
      >
        <ArrowClockwise class="w-4 h-4" />
      </button>
    {/if}
  </div>

  <div class="bg-background border rounded max-h-60 overflow-y-auto">
    <pre class="p-3 text-sm font-mono text-foreground whitespace-pre-wrap">{formattedOutput()}</pre>
  </div>
</div>

