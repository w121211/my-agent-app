<!-- src/components/PermissionConfirmation.svelte -->
<script lang="ts">
  import type { ToolCallConfirmationDetails } from '../../types/tool-call.types';
  import { ExclamationTriangle, Shield, File } from 'svelte-bootstrap-icons';

  interface Props {
    confirmationDetails: ToolCallConfirmationDetails;
    onApprove: () => void;
    onDeny: () => void;
  }

  const { confirmationDetails, onApprove, onDeny }: Props = $props();

  // Get appropriate icon based on danger level
  const dangerIcon = $derived(() => {
    switch (confirmationDetails.dangerLevel) {
      case 'high':
        return ExclamationTriangle;
      case 'medium':
        return Shield;
      default:
        return ExclamationTriangle;
    }
  });
</script>

<div class="bg-background border rounded-md p-4 mt-3 space-y-3 {confirmationDetails.dangerLevel === 'low' ? 'border-yellow-300 bg-yellow-50' : confirmationDetails.dangerLevel === 'medium' ? 'border-orange-300 bg-orange-50' : 'border-red-300 bg-red-50'}">
  <div class="flex items-center gap-2">
    {#if dangerIcon()}
      {@const DangerIcon = dangerIcon()}
      <DangerIcon class="w-5 h-5 {confirmationDetails.dangerLevel === 'low' ? 'text-yellow-500' : confirmationDetails.dangerLevel === 'medium' ? 'text-orange-500' : 'text-red-500'}" />
    {/if}
    <span class="font-medium text-foreground flex-1">Permission Required</span>
    <span class="px-2 py-1 text-xs font-bold rounded {confirmationDetails.dangerLevel === 'low' ? 'bg-yellow-200 text-yellow-800' : confirmationDetails.dangerLevel === 'medium' ? 'bg-orange-200 text-orange-800' : 'bg-red-200 text-red-800'}">
      {confirmationDetails.dangerLevel.toUpperCase()}
    </span>
  </div>

  <div class="text-foreground">
    <p>{confirmationDetails.message}</p>
  </div>

  {#if confirmationDetails.affectedResources.length > 0}
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-sm font-medium text-muted">
        <File class="w-4 h-4" />
        <span>Affected Resources:</span>
      </div>
      <ul class="space-y-1 ml-6">
        {#each confirmationDetails.affectedResources as resource}
          <li class="text-sm font-mono text-foreground bg-background px-2 py-1 rounded border">{resource}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if confirmationDetails.previewChanges}
    <details class="border border-gray-200 rounded">
      <summary class="px-3 py-2 bg-gray-50 cursor-pointer text-sm font-medium hover:bg-gray-100">Preview Changes</summary>
      <pre class="p-3 text-xs font-mono bg-white overflow-x-auto max-h-40">{confirmationDetails.previewChanges}</pre>
    </details>
  {/if}

  <div class="flex gap-2 pt-2">
    <button
      class="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors"
      onclick={onApprove}
    >
      Allow
    </button>
    <button
      class="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
      onclick={onDeny}
    >
      Deny
    </button>
  </div>
</div>

