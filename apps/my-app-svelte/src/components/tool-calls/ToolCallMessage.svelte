<!-- src/components/ToolCallMessage.svelte -->
<script lang="ts">
  import { Logger } from 'tslog';
  import { getMessageToolCalls, toolCallOperations } from '../../stores/tool-call-store';
  import ToolCallItem from './ToolCallItem.svelte';
  import OverallStatusBadge from './OverallStatusBadge.svelte';
  import { Wrench } from 'svelte-bootstrap-icons';
  import { toolCallService } from '../../services/tool-call-service';
  import { showToast } from '../../stores/ui-store';

  interface Props {
    messageId: string;
  }

  const { messageId }: Props = $props();
  const logger = new Logger({ name: 'ToolCallMessage' });

  // Use derived store to get this message's tool calls
  const messageToolCalls = getMessageToolCalls(messageId);

  // User action handlers
  async function handleToolCallAction(toolCallId: string, action: 'approve' | 'deny' | 'retry') {
    try {
      logger.info(`Handling ${action} for tool call ${toolCallId}`);
      
      switch (action) {
        case 'approve':
        case 'deny':
          await toolCallService.confirmToolCall(toolCallId, action === 'approve' ? 'approved' : 'denied');
          showToast(`Tool call ${action === 'approve' ? 'approved' : 'denied'}`, 'success');
          break;
          
        case 'retry':
          // For retry, we could implement logic to re-schedule the tool call
          logger.info('Retry functionality not yet implemented');
          showToast('Retry functionality coming soon', 'info');
          break;
      }
    } catch (error) {
      logger.error(`Failed to ${action} tool call:`, error);
      showToast(`Failed to ${action} tool call`, 'error');
    }
  }

  async function handleCancelAll() {
    try {
      await toolCallService.cancelToolCalls(messageId);
      showToast('All tool calls cancelled', 'success');
    } catch (error) {
      logger.error('Failed to cancel tool calls:', error);
      showToast('Failed to cancel tool calls', 'error');
    }
  }

  // Calculate if we have any active tool calls that can be cancelled
  const hasActiveToolCalls = $derived(() => {
    return $messageToolCalls.some(tc => 
      tc.status === 'awaiting_approval' || 
      tc.status === 'executing' || 
      tc.status === 'scheduled' ||
      tc.status === 'validating'
    );
  });
</script>

<div class="bg-surface border-border rounded-lg p-4 border mb-4">
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center gap-2">
      <Wrench class="w-5 h-5 text-accent" />
      <span class="text-accent font-medium">Function Calls</span>
      <OverallStatusBadge toolCalls={$messageToolCalls} />
    </div>
    
    {#if hasActiveToolCalls()}
      <button 
        class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        onclick={handleCancelAll}
        title="Cancel all active tool calls"
      >
        Cancel All
      </button>
    {/if}
  </div>

  <div class="space-y-3">
    {#each $messageToolCalls as toolCall (toolCall.request.callId)}
      <ToolCallItem
        {toolCall}
        onApprove={() => handleToolCallAction(toolCall.request.callId, 'approve')}
        onDeny={() => handleToolCallAction(toolCall.request.callId, 'deny')}
        onRetry={() => handleToolCallAction(toolCall.request.callId, 'retry')}
      />
    {/each}
  </div>

  {#if $messageToolCalls.length === 0}
    <div class="text-center py-4">
      <p class="text-muted text-sm">No tool calls for this message</p>
    </div>
  {/if}
</div>