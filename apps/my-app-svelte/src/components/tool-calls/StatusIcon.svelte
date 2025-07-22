<!-- src/components/StatusIcon.svelte -->
<script lang="ts">
  import type { ToolCallStatus } from '../../types/tool-call.types';
  import { 
    Clock,
    PlayFill,
    ExclamationTriangle,
    Hourglass,
    CheckCircle,
    XCircle,
    StopCircle
  } from 'svelte-bootstrap-icons';

  interface Props {
    status: ToolCallStatus;
  }

  const { status }: Props = $props();
</script>

<div class="flex items-center justify-center w-6 h-6">
  {#if status === 'validating'}
    <Clock class="w-4 h-4 text-yellow-500" />
  {:else if status === 'scheduled'}
    <Hourglass class="w-4 h-4 text-blue-500" />
  {:else if status === 'awaiting_approval'}
    <ExclamationTriangle class="w-4 h-4 text-orange-500" />
  {:else if status === 'executing'}
    <div class="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
  {:else if status === 'success'}
    <CheckCircle class="w-4 h-4 text-green-500" />
  {:else if status === 'error'}
    <XCircle class="w-4 h-4 text-red-500" />
  {:else if status === 'cancelled'}
    <StopCircle class="w-4 h-4 text-gray-500" />
  {/if}
</div>

