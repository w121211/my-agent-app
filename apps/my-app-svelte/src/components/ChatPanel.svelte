<!-- apps/my-app-svelte/src/components/ChatPanel.svelte -->
<script lang="ts">
  import { tick } from "svelte";
  import FileSearchDropdown from "./file-explorer/FileSearchDropdown.svelte";
  import ChatMessage from "./ChatMessage.svelte";
  import ToolCallConfirmation from "./ToolCallConfirmation.svelte";
  import AiGenerationDisplay from "./AiGenerationDisplay.svelte";
  import {
    chatState,
    updateMessageInput,
  } from "../stores/chat-store.svelte.js";
  import { projectState } from "../stores/project-store.svelte.js";
  import {
    uiState,
    showToast,
  } from "../stores/ui-store.svelte.js";
  import { chatService } from "../services/chat-service.js";
  import { fileSearchService } from "../services/file-search-service.js";
  import { fileSearchState } from "../stores/file-search-store.svelte.js";
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

  // Derived loading states
  const isLoadingOpenChat = $derived(uiState.loadingStates["openChat"] || false);
  const isLoadingSubmitMessage = $derived(uiState.loadingStates["submitMessage"] || false);

  // Derived chat states
  const hasCurrentChat = $derived(chatState.currentChat !== null);
  const currentChatMessages = $derived(chatState.currentChat?.messages || []);
  const currentChatBreadcrumb = $derived(() => {
    if (!chatState.currentChat) return null;

    const pathParts = chatState.currentChat.absoluteFilePath.split("/");
    const fileName = pathParts.pop();
    const parentDir = pathParts.slice(-2, -1).join("/");

    return {
      parentDir,
      fileName,
      fullPath: chatState.currentChat.absoluteFilePath,
    };
  });

  let messageInputElement = $state<HTMLTextAreaElement>();
  let messagesContainer = $state<HTMLDivElement>();
  let draftTimeout: NodeJS.Timeout;


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


  async function handleSendMessage() {
    if (!chatState.messageInput.trim() || !chatState.currentChat) return;

    const message = chatState.messageInput.trim();
    const chatId = chatState.currentChat.id;

    try {
      await chatService.sendMesage(
        chatState.currentChat.absoluteFilePath,
        chatId,
        message,
      );
    } catch (error) {
      // Error handling done in service
    }
  }

  function handleInputChange(value: string) {
    updateMessageInput(value);

    // Handle @ file reference detection
    fileSearchService.detectFileReference(value, messageInputElement);

    // Save draft when user actively types (including clearing content)
    if (chatState.currentChat) {
      clearTimeout(draftTimeout);
      draftTimeout = setTimeout(() => {
        chatService.savePromptDraft(chatState.currentChat!.id, value);
      }, 1500);
    }
  }

  // Handle file selection from dropdown
  function handleFileSelect(file: any) {
    fileSearchService.handleFileSelect(
      file,
      messageInputElement,
      chatState.messageInput,
    );
  }

  // Handle search menu cancel
  function handleSearchCancel() {
    fileSearchService.handleSearchCancel(messageInputElement);
  }

  // Handle search menu hover (for keyboard navigation)
  function handleSearchHover(index: number) {
    fileSearchService.handleSearchHover(index);
  }

  function handleKeyPress(event: KeyboardEvent) {
    // Handle search menu navigation
    const handled = fileSearchService.handleSearchKeydown(
      event,
      messageInputElement,
      chatState.messageInput,
    );

    if (handled) return;

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
      fileSearchService.cleanup();
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
        {#if breadcrumb}
          <span class="text-muted text-xs">{breadcrumb.parentDir}</span>
          <ChevronRight class="text-muted text-xs" />
          <span class="text-muted text-xs">{breadcrumb.fileName}</span>
        {/if}
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
          {#if uiState.connectionStates.chatEvents === "connected"}
            <span class="text-green-400">🟢 Live</span>
          {:else if uiState.connectionStates.chatEvents === "connecting"}
            <span class="text-yellow-400">🟡 Connecting</span>
          {:else if uiState.connectionStates.chatEvents === "error"}
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

      <!-- AI Generation Display -->
      {#if chatState.currentChat?.sessionStatus === "processing"}
        <AiGenerationDisplay chatSession={chatState.currentChat} />
      {/if}

      <!-- Tool Call Confirmation Block -->
      {#if chatState.currentChat?.sessionStatus === "waiting_confirmation"}
        {@const lastMessage = currentChatMessages[currentChatMessages.length - 1]?.message}
        <ToolCallConfirmation
          chatId={chatState.currentChat.id}
          absoluteFilePath={chatState.currentChat.absoluteFilePath}
          lastAssistantMessage={lastMessage}
        />
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
          disabled={isLoadingSubmitMessage || chatState.currentChat?.sessionStatus !== "idle"}
        ></textarea>

        <!-- File Search Dropdown -->
        <FileSearchDropdown
          results={fileSearchState.results}
          selectedIndex={fileSearchState.selectedIndex}
          visible={fileSearchState.showMenu}
          loading={fileSearchState.isSearching}
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
          disabled={!chatState.messageInput.trim() || isLoadingSubmitMessage || chatState.currentChat?.sessionStatus !== "idle"}
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
