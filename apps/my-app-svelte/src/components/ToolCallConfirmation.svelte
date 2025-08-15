<!-- apps/my-app-svelte/src/components/ToolCallConfirmation.svelte -->
<script lang="ts">
  import type { ModelMessage } from "ai";
  import { chatService } from "../services/chat-service.js";
  import { showToast } from "../stores/ui-store.svelte.js";
  import { Logger } from "tslog";

  interface Props {
    chatId: string;
    absoluteFilePath: string;
    lastAssistantMessage?: ModelMessage;
  }

  let { chatId, absoluteFilePath, lastAssistantMessage }: Props = $props();

  const logger = new Logger({ name: "ToolCallConfirmation" });

  // Extract tool calls from the last assistant message
  const toolCalls = $derived(() => {
    if (!lastAssistantMessage || lastAssistantMessage.role !== "assistant") {
      return [];
    }

    if (!Array.isArray(lastAssistantMessage.content)) {
      return [];
    }

    return lastAssistantMessage.content.filter(part => part.type === "tool-call");
  });

  async function handleToolCallConfirmation(
    toolCallId: string,
    outcome: "yes" | "no" | "yes_always"
  ) {
    try {
      logger.info("Confirming tool call:", toolCallId, outcome);
      await chatService.confirmToolCall(
        absoluteFilePath,
        chatId,
        toolCallId,
        outcome
      );
    } catch (error) {
      logger.error("Failed to confirm tool call:", error);
      // Error handling is done in the service
    }
  }
</script>

{#if toolCalls().length > 0}
  <div class="group flex flex-col items-start">
    <div class="mb-0.5 flex items-center gap-2">
      <span
        class="bg-orange-500 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
      >
        🔧
      </span>
      <span class="text-muted text-xs font-medium">Tool Confirmation Required</span>
    </div>

    <div class="text-foreground pl-7 leading-normal">
      <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
        <p class="text-sm text-orange-800 font-medium">
          Claude wants to use tools to help with your request. Please review and approve:
        </p>
        
        {#each toolCalls() as toolCall}
          <div class="bg-white border border-orange-300 rounded p-3 space-y-2">
            <div class="text-sm font-medium text-orange-900">
              🔧 {toolCall.toolName}
            </div>
            <div class="text-xs text-orange-700 bg-orange-50 rounded p-2 overflow-x-auto">
              <pre>{JSON.stringify(toolCall.input, null, 2)}</pre>
            </div>
            <div class="flex gap-2">
              <button
                onclick={() => handleToolCallConfirmation(toolCall.toolCallId, "yes")}
                class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
              >
                Yes
              </button>
              <button
                onclick={() => handleToolCallConfirmation(toolCall.toolCallId, "no")}
                class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
              >
                No
              </button>
              <button
                onclick={() => handleToolCallConfirmation(toolCall.toolCallId, "yes_always")}
                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
              >
                Always Allow
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}