<!-- apps/my-app-svelte/src/components/ChatPanel.svelte -->
<script lang="ts">
  import { tick } from "svelte";
  import FileSearchDropdown from "./file-explorer/FileSearchDropdown.svelte";
  import ChatMessage from "./ChatMessage.svelte";
  import {
    hasCurrentChat,
    currentChatMessages,
    currentChatBreadcrumb,
    isAiGeneratingForCurrentChat,
    aiGenerationStage,
    aiStreamingContent,
    chatState,
    updateMessageInput,
  } from "../stores/chat-store.svelte";
  import { projectFolders } from "../stores/project-store.svelte";
  import { selectedProjectFolder } from "../stores/tree-store.svelte";
  import { trpcClient } from "../lib/trpc-client";
  import {
    connectionStates,
    isLoadingOpenChat,
    isLoadingSubmitMessage,
    showToast,
  } from "../stores/ui-store.svelte";
  import { chatService } from "../services/chat-service";
  import { toolCallService } from "../services/tool-call-service";
  import {
    Send,
    Paperclip,
    ChatDots,
    HouseDoor,
    ChevronRight,
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
    if (currentChatMessages && messagesContainer) {
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
    const currentChatId = chatState.currentChat?.id || null;

    // Only focus if we're switching to a different chat (including from no chat to a chat)
    if (
      currentChatId &&
      currentChatId !== previousChatId &&
      messageInputElement
    ) {
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
    const currentChatId = chatState.currentChat?.id;
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
    if (!chatState.messageInput.trim() || !chatState.currentChat) return;

    const message = chatState.messageInput.trim();
    const chatId = chatState.currentChat.id;

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
    if (chatState.currentChat) {
      clearTimeout(draftTimeout);
      draftTimeout = setTimeout(() => {
        chatService.savePromptDraft(chatState.currentChat!.id, value);
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
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex === -1) {
      hideSearchMenu();
      return;
    }

    // Extract text after @
    const afterAt = value.slice(lastAtIndex + 1);
    if (afterAt.includes(" ")) {
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
    const currentProject = selectedProjectFolder || projectFolders[0];
    if (!currentProject) {
      searchResults = [];
      return;
    }

    isSearching = true;

    try {
      const results = await trpcClient.projectFolder.searchFiles.query({
        query: query || "", // Show all files if query is empty
        projectId: currentProject.id,
        limit: 10,
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

    const value = chatState.messageInput;
    const lastAtIndex = value.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      // Replace @query with @filename and add space
      const beforeAt = value.slice(0, lastAtIndex);
      const newValue = `${beforeAt}@${file.relativePath} `;

      updateMessageInput(newValue);

      // Set cursor after the space
      tick().then(() => {
        if (messageInputElement) {
          messageInputElement.focus();
          messageInputElement.setSelectionRange(
            newValue.length,
            newValue.length,
          );
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
    if (!chatState.currentChat) return;

    chatService.openChatFile(chatState.currentChat.absoluteFilePath);
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
  {#if hasCurrentChat}
    <!-- Breadcrumb Header -->
    <header
      class="bg-surface border-border flex h-12 items-center gap-2 border-b px-4"
    >
      <HouseDoor class="text-muted text-sm" />
      {#if currentChatBreadcrumb()}
        {@const breadcrumb = currentChatBreadcrumb()}
        <span class="text-muted text-xs">{breadcrumb.parentDir}</span>
        <ChevronRight class="text-muted text-xs" />
        <span class="text-muted text-xs">{breadcrumb.fileName}</span>
      {/if}
      <div class="ml-auto flex items-center space-x-2">
        <button
          onclick={handleRefreshChat}
          disabled={isLoadingOpenChat}
          class="bg-panel hover:bg-hover text-muted rounded px-2 py-1 text-xs disabled:opacity-50"
        >
          <ArrowClockwise class="text-xs" />
          {isLoadingOpenChat ? "Refreshing..." : "Refresh"}
        </button>
        <div class="text-muted text-xs">
          {#if connectionStates.chatEvents === "connected"}
            <span class="text-green-400">🟢 Live</span>
          {:else if connectionStates.chatEvents === "connecting"}
            <span class="text-yellow-400">🟡 Connecting</span>
          {:else if connectionStates.chatEvents === "error"}
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
      {#each currentChatMessages as chatMessage (chatMessage.id)}
        <ChatMessage {chatMessage} />
      {/each}

      <!-- AI Generation Message Block -->
      {#if isAiGeneratingForCurrentChat}
        <div class="group flex flex-col items-start">
          <div class="mb-0.5 flex items-center gap-2">
            <span
              class="bg-accent flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
            >
              C
            </span>
            <span class="text-muted text-xs font-medium">Claude Sonnet 4</span>
            <span class="text-muted text-xs">
              {#if aiGenerationStage === "starting"}
                Starting to respond...
              {:else if aiGenerationStage === "streaming"}
                Responding...
              {:else}
                Completing...
              {/if}
            </span>
          </div>

          <div class="text-foreground pl-7 leading-normal">
            {#if aiGenerationStage === "starting"}
              <!-- Starting stage -->
              <div class="flex items-center gap-2">
                <div class="animate-pulse text-muted">Thinking...</div>
                <div class="flex space-x-1">
                  <div
                    class="h-1 w-1 bg-muted rounded-full animate-pulse"
                  ></div>
                  <div
                    class="h-1 w-1 bg-muted rounded-full animate-pulse delay-75"
                  ></div>
                  <div
                    class="h-1 w-1 bg-muted rounded-full animate-pulse delay-150"
                  ></div>
                </div>
              </div>
            {:else if aiGenerationStage === "streaming"}
              <!-- Streaming stage -->
              <div class="whitespace-pre-wrap">
                {aiStreamingContent}
                <span class="animate-pulse">|</span>
              </div>
            {:else}
              <!-- Completing stage -->
              <div class="flex items-center gap-2">
                <div class="animate-pulse text-muted">Finalizing...</div>
                <div class="flex space-x-1">
                  <div
                    class="h-1 w-1 bg-muted rounded-full animate-pulse"
                  ></div>
                  <div
                    class="h-1 w-1 bg-muted rounded-full animate-pulse delay-75"
                  ></div>
                  <div
                    class="h-1 w-1 bg-muted rounded-full animate-pulse delay-150"
                  ></div>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- Input Area -->
    <footer class="border-border bg-panel border-t px-6 py-4">
      <div class="relative">
        <textarea
          bind:this={messageInputElement}
          bind:value={chatState.messageInput}
          oninput={(e) => handleInputChange(e.currentTarget.value)}
          onkeypress={handleKeyPress}
          onkeydown={handleKeyPress}
          placeholder="Type your message... Use @ to reference files"
          class="bg-input-background border-input-border focus:border-accent placeholder-muted text-foreground w-full resize-none rounded-md border px-3 py-3 text-[15px] focus:outline-none"
          rows="3"
          disabled={isLoadingSubmitMessage}
        ></textarea>

        <!-- File Search Dropdown -->
        <FileSearchDropdown
          results={searchResults}
          {selectedIndex}
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
          bind:value={chatState.chatMode}
          class="bg-panel border-border hover:bg-hover focus:border-accent text-muted rounded border px-3 py-1 text-xs focus:outline-none"
        >
          {#each chatModeOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>

        <!-- Model Select -->
        <select
          bind:value={chatState.selectedModel}
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
          disabled={!chatState.messageInput.trim() || isLoadingSubmitMessage}
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
