<!-- apps/my-app-svelte/src/components/ChatPanel.svelte -->
<script lang="ts">
  import { tick } from "svelte";
  import FileSearchDropdown from "./file-explorer/FileSearchDropdown.svelte";
  import ToolCallMessage from "./tool-calls/ToolCallMessage.svelte";
  import {
    hasCurrentChat,
    currentChat,
    currentChatMessages,
    currentChatBreadcrumb,
    messageInput,
    updateMessageInput,
    chatMode,
    selectedModel,
    extractFileReferences,
  } from "../stores/chat-store";
  import { projectFolders } from "../stores/project-store";
  import { selectedProjectFolder } from "../stores/tree-store";
  import { trpcClient } from "../lib/trpc-client";
  import {
    connectionStates,
    isLoadingOpenChat,
    isLoadingSubmitMessage,
    showToast,
  } from "../stores/ui-store";
  import { chatService } from "../services/chat-service";
  import { toolCallService } from "../services/tool-call-service";
  import {
    Send,
    Paperclip,
    ChatDots,
    Pencil,
    Copy,
    ThreeDots,
    HouseDoor,
    ChevronRight,
    Download,
    Lightbulb,
    FileEarmark,
    ArrowClockwise,
  } from "svelte-bootstrap-icons";
  import { Logger } from "tslog";

  const logger = new Logger({ name: "ChatPanel" });

  let messageInputElement = $state<HTMLTextAreaElement>();
  let messagesContainer = $state<HTMLDivElement>();
  let draftTimeout: NodeJS.Timeout;

  // File search state
  let searchQuery = $state<string>("");
  let searchResults = $state<any[]>([]);
  let showSearchMenu = $state<boolean>(false);
  let selectedIndex = $state<number>(0);
  let isSearching = $state<boolean>(false);
  let searchTimeout: NodeJS.Timeout;

  // File search interfaces
  interface FileSearchResult {
    name: string;
    relativePath: string;
    absolutePath: string;
    score?: number;
    highlight?: string;
  }

  // Auto-scroll to bottom when new messages arrive using $effect
  $effect(() => {
    if ($currentChatMessages && messagesContainer) {
      tick().then(() => {
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      });
    }
  });

  // Auto-focus input when a new chat is opened using $effect
  let previousChatId: string | null = null;
  $effect(() => {
    const currentChatId = $currentChat?.id || null;
    
    // Only focus if we're switching to a different chat (including from no chat to a chat)
    if (currentChatId && currentChatId !== previousChatId && messageInputElement) {
      tick().then(() => {
        if (messageInputElement) {
          messageInputElement.focus();
        }
      });
    }
    
    previousChatId = currentChatId;
  });

  // Tool call polling setup for active chats
  $effect(() => {
    const currentChatId = $currentChat?.id;
    let cleanupPolling: (() => void) | null = null;
    
    if (currentChatId) {
      // Start polling for tool call updates for this chat
      // This is a fallback in case real-time events aren't working
      // toolCallService.pollToolCallUpdates(currentChatId, 2000).then(cleanup => {
      //   cleanupPolling = cleanup;
      // });
    }
    
    return () => {
      if (cleanupPolling) {
        cleanupPolling();
      }
    };
  });


  async function handleSendMessage() {
    if (!$messageInput.trim() || !$currentChat) return;

    const message = $messageInput.trim();
    const chatId = $currentChat.id;

    try {
      await chatService.submitMessage(chatId, message);
    } catch (error) {
      // Error handling done in service
    }
  }

  function handleInputChange(value: string) {
    updateMessageInput(value);
    
    // Handle @ file reference detection
    detectFileReference(value);
    
    // Save draft when user actively types (including clearing content)
    if ($currentChat) {
      clearTimeout(draftTimeout);
      draftTimeout = setTimeout(() => {
        chatService.savePromptDraft($currentChat!.id, value);
      }, 1500);
    }
  }

  // Detect @ file reference trigger
  function detectFileReference(value: string) {
    if (!messageInputElement) return;
    
    const cursorPos = messageInputElement.selectionStart;
    
    // Only process if cursor is at end (Ultra-MVP approach)
    if (cursorPos !== value.length) {
      hideSearchMenu();
      return;
    }
    
    // Find last @ symbol
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex === -1) {
      hideSearchMenu();
      return;
    }
    
    // Extract text after @
    const afterAt = value.slice(lastAtIndex + 1);
    if (afterAt.includes(' ')) {
      hideSearchMenu();
      return;
    }
    
    // Trigger search
    const query = afterAt;
    searchQuery = query;
    showSearchMenu = true;
    selectedIndex = 0;
    
    // Debounced search
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performFileSearch(query);
    }, 300);
  }

  // Perform file search
  async function performFileSearch(query: string) {
    // Get current project ID
    const currentProject = $selectedProjectFolder || $projectFolders[0];
    if (!currentProject) {
      searchResults = [];
      return;
    }
    
    isSearching = true;
    
    try {
      const results = await trpcClient.projectFolder.searchFiles.query({
        query: query || "", // Show all files if query is empty
        projectId: currentProject.id,
        limit: 10
      });
      
      searchResults = results;
    } catch (error) {
      logger.error("File search failed:", error);
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }

  // Hide search menu
  function hideSearchMenu() {
    showSearchMenu = false;
    searchResults = [];
    searchQuery = "";
    selectedIndex = 0;
    clearTimeout(searchTimeout);
  }

  // Handle file selection from dropdown
  function handleFileSelect(file: FileSearchResult) {
    if (!messageInputElement) return;
    
    const value = $messageInput;
    const lastAtIndex = value.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Replace @query with @filename and add space
      const beforeAt = value.slice(0, lastAtIndex);
      const newValue = `${beforeAt}@${file.relativePath} `;
      
      updateMessageInput(newValue);
      
      // Set cursor after the space
      tick().then(() => {
        if (messageInputElement) {
          messageInputElement.focus();
          messageInputElement.setSelectionRange(newValue.length, newValue.length);
        }
      });
    }
    
    hideSearchMenu();
  }

  // Handle search menu cancel
  function handleSearchCancel() {
    hideSearchMenu();
    if (messageInputElement) {
      messageInputElement.focus();
    }
  }

  // Handle search menu hover (for keyboard navigation)
  function handleSearchHover(index: number) {
    selectedIndex = index;
  }

  function handleKeyPress(event: KeyboardEvent) {
    // Handle search menu navigation
    if (showSearchMenu) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, searchResults.length - 1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        if (searchResults[selectedIndex]) {
          handleFileSelect(searchResults[selectedIndex]);
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        handleSearchCancel();
        return;
      }
    }
    
    // Normal message sending
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  function handleRefreshChat() {
    if (!$currentChat) return;

    chatService.openChatFile($currentChat.absoluteFilePath);
  }

  function formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleCopyMessage(content: string) {
    navigator.clipboard.writeText(content);
    showToast("Message copied to clipboard", "success");
  }

  function handleEditMessage() {
    showToast("Edit functionality not implemented yet", "info");
  }

  function handleMoreAction(action: string) {
    showToast(`${action} functionality coming soon`, "info");
  }

  function handleFileReference(filePath: string) {
    // TODO: Open file in preview or explorer
    showToast(`Open ${filePath} functionality coming soon`, "info");
  }

  function handleWhatsNext() {
    showToast(
      "What's Next: Analyze your recent code changes for patterns.",
      "info",
    );
  }

  function handleSummarize() {
    showToast("Chat summary functionality coming soon", "info");
  }

  // Chat mode and model options
  const chatModeOptions = [
    { value: "chat", label: "Chat" },
    { value: "agent", label: "Agent" },
  ];

  const modelOptions = [
    { value: "claude", label: "Claude 3.7" },
    { value: "gemini", label: "Gemini 2.5 Pro" },
  ];

  // Cleanup timeouts on component destroy using $effect
  $effect(() => {
    return () => {
      clearTimeout(draftTimeout);
      clearTimeout(searchTimeout);
    };
  });
</script>

<div class="bg-background flex min-w-0 flex-1 flex-col">
  {#if $hasCurrentChat}
    <!-- Breadcrumb Header -->
    <header
      class="bg-surface border-border flex h-12 items-center gap-2 border-b px-4"
    >
      <HouseDoor class="text-muted text-sm" />
      {#if $currentChatBreadcrumb}
        <span class="text-muted text-xs"
          >{$currentChatBreadcrumb.parentDir}</span
        >
        <ChevronRight class="text-muted text-xs" />
        <span class="text-muted text-xs">{$currentChatBreadcrumb.fileName}</span
        >
      {/if}
      <div class="ml-auto flex items-center space-x-2">
        <button
          onclick={handleRefreshChat}
          disabled={$isLoadingOpenChat}
          class="bg-panel hover:bg-hover text-muted rounded px-2 py-1 text-xs disabled:opacity-50"
        >
          <ArrowClockwise class="text-xs" />
          {$isLoadingOpenChat ? "Refreshing..." : "Refresh"}
        </button>
        <div class="text-muted text-xs">
          {#if $connectionStates.chatEvents === "connected"}
            <span class="text-green-400">🟢 Live</span>
          {:else if $connectionStates.chatEvents === "connecting"}
            <span class="text-yellow-400">🟡 Connecting</span>
          {:else if $connectionStates.chatEvents === "error"}
            <span class="text-red-400">🔴 Disconnected</span>
          {:else}
            <span class="text-muted">⚪ Idle</span>
          {/if}
        </div>
      </div>
    </header>

    <!-- Messages Area -->
    <div
      bind:this={messagesContainer}
      class="bg-background flex-1 space-y-5 overflow-y-auto px-8 py-6"
    >
      {#each $currentChatMessages as message (message.id)}
        {#if message.role === "FUNCTION_CALL" || message.role === "TOOL_CALL"}
          <!-- Tool Call Message -->
          <ToolCallMessage messageId={message.id} />
        {:else if message.role === "USER"}
          {@const fileReferences = extractFileReferences(message.content)}
          <!-- User Message -->
          <div class="group flex flex-col items-end">
            <div
              class="bg-accent/20 border-accent/30 text-foreground ml-auto max-w-xl rounded-lg border px-4 py-2"
            >
              <!-- File References -->
              {#if fileReferences.length > 0}
                <div class="mb-2 flex flex-wrap gap-1">
                  {#each fileReferences as ref}
                    <button
                      onclick={() => handleFileReference(ref.path)}
                      class="text-sm underline {ref.syntax === '@' ? 'text-blue-500 hover:text-blue-400' : 'text-accent hover:text-accent/80'}"
                    >
                      {ref.syntax}{ref.path}
                    </button>
                  {/each}
                </div>
              {/if}

              <!-- Message Content -->
              <div class="leading-normal whitespace-pre-wrap">
                {message.content}
              </div>

              <!-- Timestamp -->
              <div class="text-accent/60 mt-2 text-xs">
                {formatTimestamp(message.timestamp)}
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
                onclick={() => handleCopyMessage(message.content)}
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
        {:else}
          <!-- Assistant Message -->
          <div class="group flex flex-col items-start">
            <div class="mb-0.5 flex items-center gap-2">
              <span
                class="bg-accent flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
              >
                C
              </span>
              <span class="text-muted text-xs font-medium">Claude Sonnet 4</span
              >
              <span class="text-muted text-xs"
                >{formatTimestamp(message.timestamp)}</span
              >
            </div>

            <div class="text-foreground pl-7 leading-normal">
              <!-- Message Content -->
              <div class="whitespace-pre-wrap">{message.content}</div>

              <!-- Artifacts (placeholder) -->
              {#if message.content.includes("artifact") || message.content.includes("wireframe")}
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
                onclick={() => handleCopyMessage(message.content)}
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
        {/if}
      {/each}

      <!-- Loading indicator for AI response -->
      {#if $isLoadingSubmitMessage}
        <div class="flex items-start">
          <span
            class="bg-accent flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
          >
            C
          </span>
          <div class="text-muted ml-3 text-sm">
            <div class="flex items-center gap-2">
              <div class="animate-pulse">Thinking...</div>
              <div class="flex space-x-1">
                <div class="h-1 w-1 bg-muted rounded-full animate-pulse"></div>
                <div
                  class="h-1 w-1 bg-muted rounded-full animate-pulse delay-75"
                ></div>
                <div
                  class="h-1 w-1 bg-muted rounded-full animate-pulse delay-150"
                ></div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Input Area -->
    <footer class="border-border bg-panel border-t px-6 py-4">
      <div class="relative">
        <textarea
          bind:this={messageInputElement}
          bind:value={$messageInput}
          oninput={(e) => handleInputChange(e.currentTarget.value)}
          onkeypress={handleKeyPress}
          onkeydown={handleKeyPress}
          placeholder="Type your message... Use @ to reference files"
          class="bg-input-background border-input-border focus:border-accent placeholder-muted text-foreground w-full resize-none rounded-md border px-3 py-3 text-[15px] focus:outline-none"
          rows="3"
          disabled={$isLoadingSubmitMessage}
        ></textarea>
        
        <!-- File Search Dropdown -->
        <FileSearchDropdown
          results={searchResults}
          selectedIndex={selectedIndex}
          visible={showSearchMenu}
          loading={isSearching}
          onselect={handleFileSelect}
          oncancel={handleSearchCancel}
          onhover={handleSearchHover}
        />
      </div>

      <!-- Controls below input -->
      <div class="mt-2 flex flex-wrap items-center gap-3">
        <button
          onclick={() => showToast("Attach functionality coming soon", "info")}
          class="text-muted hover:text-accent"
          title="Attach"
        >
          <Paperclip class="text-base" />
        </button>

        <!-- Chat Mode Select -->
        <select
          bind:value={$chatMode}
          class="bg-panel border-border hover:bg-hover focus:border-accent text-muted rounded border px-3 py-1 text-xs focus:outline-none"
        >
          {#each chatModeOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>

        <!-- Model Select -->
        <select
          bind:value={$selectedModel}
          class="bg-panel border-border hover:bg-hover focus:border-accent text-muted rounded border px-3 py-1 text-xs focus:outline-none"
        >
          {#each modelOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>

        <button
          onclick={handleWhatsNext}
          class="text-muted hover:text-accent flex items-center text-xs"
        >
          <Lightbulb class="mr-1 text-sm" />
          What's next
        </button>

        <button
          onclick={handleSummarize}
          class="text-muted hover:text-accent flex items-center text-xs"
        >
          <FileEarmark class="mr-1 text-sm" />
          Summarize
        </button>

        <!-- Send button -->
        <button
          onclick={handleSendMessage}
          disabled={!$messageInput.trim() || $isLoadingSubmitMessage}
          class="hover:bg-accent/80 bg-accent text-white ml-auto rounded px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          title="Send"
        >
          <Send class="text-base" />
        </button>
      </div>
    </footer>
  {:else}
    <!-- No Chat Selected -->
    <div class="bg-background flex flex-1 items-center justify-center">
      <div class="text-muted text-center">
        <ChatDots class="mx-auto mb-4 text-5xl" />
        <p class="mb-2">Select a chat file to start</p>
        <p class="text-xs opacity-75">
          Create a new chat from the file explorer
        </p>
      </div>
    </div>
  {/if}
</div>
