// apps/my-app-svelte/src/stores/chat-store.svelte.ts
import type {
  ChatSessionData,
  ChatMessage,
  ChatMode,
} from "@repo/events-core/services/chat-engine/chat-session-repository";

type AiGenerationStage = "starting" | "streaming" | "completed";

interface ChatState {
  currentChat: ChatSessionData | null;
  messageInput: string;
  chatMode: ChatMode;
  selectedModel: string;
  isSubmittingMessage: boolean;
}

interface AiGenerationState {
  isGenerating: boolean;
  chatId: string | null;
  stage: AiGenerationStage | null;
  streamingContent: string;
  messageId: string | null;
}

// Core chat state - using object wrapper pattern for mutable state
export const chatState = $state<ChatState>({
  currentChat: null,
  messageInput: "",
  chatMode: "chat",
  selectedModel: "claude",
  isSubmittingMessage: false,
});

// AI generation state
export const aiGenerationState = $state<AiGenerationState>({
  isGenerating: false,
  chatId: null,
  stage: null,
  streamingContent: "",
  messageId: null,
});

// Derived stores
export const hasCurrentChat = $derived(chatState.currentChat !== null);

export const currentChatMessages = $derived(
  chatState.currentChat?.messages || [],
);

export const currentChatId = $derived(chatState.currentChat?.id || null);

export const currentChatTitle = $derived(() => {
  if (!chatState.currentChat) return null;

  return (
    chatState.currentChat.metadata?.title ||
    chatState.currentChat.absoluteFilePath
      .split("/")
      .pop()
      ?.replace(".chat.json", "") ||
    "Untitled Chat"
  );
});

export const hasMessageInput = $derived(
  chatState.messageInput.trim().length > 0,
);

export const currentChatBreadcrumb = $derived(() => {
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

export const messageCount = $derived(currentChatMessages.length);

export const lastMessage = $derived(
  currentChatMessages[currentChatMessages.length - 1] || null,
);

export const lastUserMessage = $derived(() => {
  for (let i = currentChatMessages.length - 1; i >= 0; i--) {
    if (currentChatMessages[i].message.role === "user") {
      return currentChatMessages[i];
    }
  }
  return null;
});

export const lastAssistantMessage = $derived(() => {
  for (let i = currentChatMessages.length - 1; i >= 0; i--) {
    if (currentChatMessages[i].message.role === "assistant") {
      return currentChatMessages[i];
    }
  }
  return null;
});

// AI generation derived stores
export const isAiGeneratingForCurrentChat = $derived(
  aiGenerationState.isGenerating && aiGenerationState.chatId === currentChatId,
);

export const aiGenerationStage = $derived(aiGenerationState.stage);

export const aiStreamingContent = $derived(aiGenerationState.streamingContent);

// Helper functions for working with chat stores
export function setCurrentChat(chat: ChatSessionData | null) {
  chatState.currentChat = chat;

  // Reset message input when switching chats
  if (chat?.metadata?.promptDraft) {
    chatState.messageInput = chat.metadata.promptDraft;
  } else {
    chatState.messageInput = "";
  }

  // Update chat settings from metadata
  if (chat?.metadata?.mode) {
    chatState.chatMode = chat.metadata.mode;
  }
}

export function clearCurrentChat() {
  chatState.currentChat = null;
  chatState.messageInput = "";
  chatState.isSubmittingMessage = false;
  // Clear AI generation state when switching chats
  clearAiGenerationState();
}

export function updateMessageInput(value: string) {
  chatState.messageInput = value;
}

export function clearMessageInput() {
  chatState.messageInput = "";
}

export function addMessageToCurrentChat(message: ChatMessage) {
  if (!chatState.currentChat) return;

  chatState.currentChat.messages = [...chatState.currentChat.messages, message];
  chatState.currentChat.updatedAt = new Date();
}

export function updateChatMetadata(
  metadata: Partial<ChatSessionData["metadata"]>,
) {
  if (!chatState.currentChat) return;

  chatState.currentChat.metadata = {
    ...chatState.currentChat.metadata,
    ...metadata,
  };
  chatState.currentChat.updatedAt = new Date();
}

// Extract file references from message content
export function extractFileReferences(
  content: string,
): Array<{ path: string; type: "file" | "image"; syntax: "#" | "@" }> {
  const references: Array<{
    path: string;
    type: "file" | "image";
    syntax: "#" | "@";
  }> = [];

  // Pattern for both # and @ syntax
  const hashRegex =
    /#([^\s]+\.(png|jpg|jpeg|md|html|ts|js|tsx|jsx|json|css|svg|gif|pdf))/gi;
  const atRegex =
    /@([^\s]+\.(png|jpg|jpeg|md|html|ts|js|tsx|jsx|json|css|svg|gif|pdf))/gi;

  let match;

  // Extract # references
  while ((match = hashRegex.exec(content)) !== null) {
    if (match[1]) {
      const filePath = match[1];
      const isImage = /\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i.test(filePath);
      references.push({
        path: filePath,
        type: isImage ? "image" : "file",
        syntax: "#",
      });
    }
  }

  // Extract @ references
  while ((match = atRegex.exec(content)) !== null) {
    if (match[1]) {
      const filePath = match[1];
      const isImage = /\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i.test(filePath);
      references.push({
        path: filePath,
        type: isImage ? "image" : "file",
        syntax: "@",
      });
    }
  }

  return references;
}

// AI generation state management functions
export function startAiGeneration(chatId: string, messageId?: string) {
  aiGenerationState.isGenerating = true;
  aiGenerationState.chatId = chatId;
  aiGenerationState.stage = "starting";
  aiGenerationState.streamingContent = "";
  aiGenerationState.messageId = messageId || null;
}

export function updateAiGenerationStage(stage: AiGenerationStage) {
  aiGenerationState.stage = stage;
}

export function updateStreamingContent(content: string) {
  aiGenerationState.stage = "streaming";
  aiGenerationState.streamingContent = content;
}

export function completeAiGeneration() {
  aiGenerationState.stage = "completed";

  // Clear state after a brief delay to allow UI transitions
  setTimeout(() => {
    clearAiGenerationState();
  }, 500);
}

export function clearAiGenerationState() {
  aiGenerationState.isGenerating = false;
  aiGenerationState.chatId = null;
  aiGenerationState.stage = null;
  aiGenerationState.streamingContent = "";
  aiGenerationState.messageId = null;
}
