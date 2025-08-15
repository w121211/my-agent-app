<!-- apps/my-app-svelte/src/components/ChatMessage.svelte -->
<script lang="ts">
  import type { ModelMessage, AssistantContent, UserContent, ToolContent } from "ai";
  import {
    Copy,
    Pencil,
    ThreeDots,
    FileEarmark,
    Download,
  } from "svelte-bootstrap-icons";
  import { showToast } from "../stores/ui-store.svelte.js";
  import { extractFileReferences } from "../stores/chat-store.svelte.js";
  import ToolResultDisplay from "./ToolResultDisplay.svelte";
  import type { ChatMessage } from "@repo/events-core/services/chat-engine/chat-session-repository";

  interface Props {
    chatMessage: ChatMessage;
  }

  let { chatMessage }: Props = $props();

  const message = chatMessage.message;
  const metadata = chatMessage.metadata;

  // Message type discrimination
  const isSystem = message.role === "system";
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isTool = message.role === "tool";

  function formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleCopyMessage(message: ModelMessage) {
    const textContent = getTextContent(message);
    navigator.clipboard.writeText(textContent);
    showToast("Message copied to clipboard", "success");
  }

  function handleEditMessage() {
    showToast("Edit functionality not implemented yet", "info");
  }

  function handleMoreAction(action: string) {
    showToast(`${action} functionality coming soon`, "info");
  }

  function handleFileReference(filePath: string) {
    showToast(`Open ${filePath} functionality coming soon`, "info");
  }

  // Helper to get text content from message
  function getTextContent(message: ModelMessage): string {
    if (typeof message.content === "string") {
      return message.content;
    }

    if (Array.isArray(message.content)) {
      return message.content
        .filter((part) => part.type === "text")
        .map((part) => part.type === "text" ? part.text : "")
        .join("");
    }

    return "";
  }

  // Helper to get content parts for rendering
  function getContentParts(content: AssistantContent | UserContent | ToolContent) {
    if (typeof content === "string") {
      return [{ type: "text" as const, text: content }];
    }
    return Array.isArray(content) ? content : [];
  }

</script>

{#if isSystem}
  <!-- System Message -->
  <div class="flex justify-center my-2">
    <div
      class="bg-muted/20 text-muted-foreground px-3 py-1 rounded-full text-xs"
    >
      System: {typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content)}
    </div>
  </div>
{:else if isUser}
  <!-- User Message -->
  <div class="group flex flex-col items-end">
    <div
      class="bg-accent/20 border-accent/30 text-foreground ml-auto max-w-xl rounded-lg border px-4 py-2"
    >
      <!-- Content Parts -->
      <div class="leading-normal">
        {#each getContentParts(message.content) as part}
          {#if part.type === "text"}
            {@const fileReferences = extractFileReferences(part.text)}
            
            <!-- File References -->
            {#if fileReferences.length > 0}
              <div class="mb-2 flex flex-wrap gap-1">
                {#each fileReferences as ref}
                  <button
                    onclick={() => handleFileReference(ref.path)}
                    class="text-sm underline {ref.syntax === '@'
                      ? 'text-blue-500 hover:text-blue-400'
                      : 'text-accent hover:text-accent/80'}"
                  >
                    {ref.syntax}{ref.path}
                  </button>
                {/each}
              </div>
            {/if}
            
            <div class="whitespace-pre-wrap">{part.text}</div>
          {:else if part.type === "image"}
            <img
              src={typeof part.image === "string" ? part.image : part.image instanceof URL ? part.image.toString() : ""}
              alt=""
              class="max-w-full rounded"
            />
          {:else if part.type === "file"}
            <div class="border rounded p-2 my-1">
              <FileEarmark class="inline text-sm mr-1" />
              File: {part.filename || "Uploaded file"}
            </div>
          {:else}
            <div class="text-muted text-xs">
              {part.type}: {JSON.stringify(part)}
            </div>
          {/if}
        {/each}
      </div>

      <!-- Timestamp -->
      <div class="text-accent/60 mt-2 text-xs">
        {formatTimestamp(metadata.timestamp)}
      </div>
    </div>

    <!-- Message Actions -->
    <div
      class="mt-1 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100 mr-2"
    >
      <button
        onclick={() => handleEditMessage()}
        class="text-muted hover:text-accent"
        title="Edit"
      >
        <Pencil class="text-sm" />
      </button>
      <button
        onclick={() => handleCopyMessage(message)}
        class="text-muted hover:text-accent"
        title="Copy"
      >
        <Copy class="text-sm" />
      </button>
      <button
        onclick={() => handleMoreAction("More options")}
        class="text-muted hover:text-accent"
        title="More"
      >
        <ThreeDots class="text-sm" />
      </button>
    </div>
  </div>
{:else if isAssistant}
  <!-- Assistant Message -->
  {@const contentParts = getContentParts(message.content)}
  {@const hasArtifacts = contentParts.some(part => part.type === "text" && (part.text.includes("artifact") || part.text.includes("wireframe")))}

  <div class="group flex flex-col items-start">
    <div class="mb-0.5 flex items-center gap-2">
      <span
        class="bg-accent flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
      >
        C
      </span>
      <span class="text-muted text-xs font-medium">Claude Sonnet 4</span>
      <span class="text-muted text-xs">
        {formatTimestamp(metadata.timestamp)}
      </span>
    </div>

    <div class="text-foreground pl-7 leading-normal">
      <!-- Content Parts -->
      {#each contentParts as part}
        {#if part.type === "text"}
          <div class="whitespace-pre-wrap">{part.text}</div>
        {:else if part.type === "file"}
          <div class="border rounded p-2 my-1">
            <FileEarmark class="inline text-sm mr-1" />
            File: {part.filename || "Generated file"}
          </div>
        {:else if part.type === "reasoning"}
          <div
            class="bg-muted/10 border-l-2 border-muted pl-3 py-1 my-2 text-sm text-muted-foreground"
          >
            <strong>Reasoning:</strong>
            {part.text}
          </div>
        {:else if part.type === "tool-call"}
          <div class="bg-blue-50 border border-blue-200 rounded p-2 my-1">
            <div class="text-sm font-medium text-blue-800">
              🔧 Calling {part.toolName}
            </div>
            <div class="text-xs text-blue-600 mt-1">
              {JSON.stringify(part.input, null, 2)}
            </div>
          </div>
        {:else if part.type === "tool-result"}
          <div class="bg-green-50 border border-green-200 rounded p-2 my-1">
            <div class="text-sm font-medium text-green-800">✅ Tool Result</div>
            <ToolResultDisplay output={part.output} />
          </div>
        {:else}
          <div class="text-muted text-xs">
            Unknown part type: {part.type}
            <pre class="mt-1">{JSON.stringify(part, null, 2)}</pre>
          </div>
        {/if}
      {/each}

      <!-- Artifacts -->
      {#if hasArtifacts}
        <div class="mt-2 flex items-center gap-2">
          <button
            onclick={() => handleMoreAction("Preview artifact")}
            class="border-border bg-panel hover:bg-hover text-foreground flex items-center gap-2 rounded border px-3 py-1 text-sm font-medium"
          >
            <FileEarmark class="text-sm" />
            wireframe.html
            <span class="text-muted ml-1 text-xs">v3</span>
          </button>
          <button
            onclick={() => handleMoreAction("Download artifact")}
            class="text-muted hover:text-accent"
            title="Download"
          >
            <Download class="text-sm" />
          </button>
        </div>
      {/if}
    </div>

    <!-- Message Actions -->
    <div
      class="mt-1 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100 ml-7"
    >
      <button
        onclick={() => handleEditMessage()}
        class="text-muted hover:text-accent"
        title="Edit"
      >
        <Pencil class="text-sm" />
      </button>
      <button
        onclick={() => handleCopyMessage(message)}
        class="text-muted hover:text-accent"
        title="Copy"
      >
        <Copy class="text-sm" />
      </button>
      <button
        onclick={() => handleMoreAction("More options")}
        class="text-muted hover:text-accent"
        title="More"
      >
        <ThreeDots class="text-sm" />
      </button>
    </div>
  </div>
{:else if isTool}
  <!-- Tool Message -->
  <div class="flex justify-center my-2">
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-lg">
      <div class="text-sm font-medium text-yellow-800 mb-1">
        🔧 Tool Results
      </div>
      {#each Array.isArray(message.content) ? message.content : [] as part}
        {#if part.type === "tool-result"}
          <div class="text-xs text-yellow-700">
            <strong>Tool:</strong>
            {part.toolName}<br />
            <strong>Call ID:</strong>
            {part.toolCallId}<br />
            <strong>Result:</strong>
            <ToolResultDisplay output={part.output} />
          </div>
        {:else}
          <div class="text-xs text-yellow-700">
            {JSON.stringify(part, null, 2)}
          </div>
        {/if}
      {/each}
    </div>
  </div>
{:else}
  <!-- Unknown message type -->
  <div class="flex justify-center my-2">
    <div
      class="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-600"
    >
      Unknown message type: {(message as any).role}
      <pre class="mt-1">{JSON.stringify(message, null, 2)}</pre>
    </div>
  </div>
{/if}
