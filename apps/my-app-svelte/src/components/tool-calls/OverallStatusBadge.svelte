<!-- src/components/OverallStatusBadge.svelte -->
<script lang="ts">
  import type { ToolCall } from '../../types/tool-call.types';
  
  interface Props {
    toolCalls: ToolCall[];
  }

  const { toolCalls }: Props = $props();

  // Calculate overall status and counts
  const summary = $derived(() => {
    const total = toolCalls.length;
    const pending = toolCalls.filter(tc => tc.status === "awaiting_approval").length;
    const executing = toolCalls.filter(tc => tc.status === "executing").length;
    const successful = toolCalls.filter(tc => tc.status === "success").length;
    const failed = toolCalls.filter(tc => tc.status === "error").length;
    const cancelled = toolCalls.filter(tc => tc.status === "cancelled").length;
    const validating = toolCalls.filter(tc => tc.status === "validating").length;
    const scheduled = toolCalls.filter(tc => tc.status === "scheduled").length;
    
    const completed = successful + failed + cancelled;
    
    // Determine overall status
    let overallStatus: string;
    let statusClass: string;
    
    if (total === 0) {
      overallStatus = "Empty";
      statusClass = "bg-gray-100 text-gray-600";
    } else if (pending > 0) {
      overallStatus = "Awaiting Approval";
      statusClass = "bg-orange-100 text-orange-700";
    } else if (executing > 0 || validating > 0 || scheduled > 0) {
      overallStatus = "Executing";
      statusClass = "bg-blue-100 text-blue-700";
    } else if (failed > 0) {
      overallStatus = "Failed";
      statusClass = "bg-red-100 text-red-700";
    } else if (cancelled > 0 && successful === 0) {
      overallStatus = "Cancelled";
      statusClass = "bg-gray-100 text-gray-600";
    } else if (completed === total && successful > 0) {
      overallStatus = "Completed";
      statusClass = "bg-green-100 text-green-700";
    } else {
      overallStatus = "Mixed";
      statusClass = "bg-yellow-100 text-yellow-700";
    }
    
    return {
      total,
      pending,
      executing,
      successful,
      failed,
      cancelled,
      completed,
      overallStatus,
      statusClass
    };
  });
</script>

<div class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium {summary().statusClass}" title="Tool calls: {summary().completed}/{summary().total} completed">
  <span class="font-medium">{summary().overallStatus}</span>
  <span class="text-opacity-75">({summary().completed}/{summary().total})</span>
</div>

