// apps/my-app-svelte/src/stores/chat-store.ts
import { writable, derived } from "svelte/store";
// import type { Chat, ChatMessage } from "$services";
import type { Chat, ChatMessage } from "../services/chat-service";

// Core chat state
export const currentChat = writable<Chat | null>(null);
export const messageInput = writable<string>("");

// Chat settings
export const chatMode = writable<"chat" | "agent">("chat");
export const selectedModel = writable<string>("claude");

// Chat UI state
export const isSubmittingMessage = writable<boolean>(false);

// Derived stores
export const hasCurrentChat = derived(
  currentChat,
  ($currentChat) => $currentChat !== null,
);

export const currentChatMessages = derived(
  currentChat,
  ($currentChat) => $currentChat?.messages || [],
);

export const currentChatId = derived(
  currentChat,
  ($currentChat) => $currentChat?.id || null,
);

export const currentChatTitle = derived(currentChat, ($currentChat) => {
  if (!$currentChat) return null;

  return (
    $currentChat.metadata?.title ||
    $currentChat.absoluteFilePath.split("/").pop()?.replace(".chat.json", "") ||
    "Untitled Chat"
  );
});

export const hasMessageInput = derived(
  messageInput,
  ($messageInput) => $messageInput.trim().length > 0,
);

export const currentChatBreadcrumb = derived(currentChat, ($currentChat) => {
  if (!$currentChat) return null;

  const pathParts = $currentChat.absoluteFilePath.split("/");
  const fileName = pathParts.pop();
  const parentDir = pathParts.slice(-2, -1).join("/");

  return {
    parentDir,
    fileName,
    fullPath: $currentChat.absoluteFilePath,
  };
});

export const messageCount = derived(
  currentChatMessages,
  ($messages) => $messages.length,
);

export const lastMessage = derived(
  currentChatMessages,
  ($messages) => $messages[$messages.length - 1] || null,
);

export const lastUserMessage = derived(currentChatMessages, ($messages) => {
  for (let i = $messages.length - 1; i >= 0; i--) {
    if ($messages[i].role === "USER") {
      return $messages[i];
    }
  }
  return null;
});

export const lastAssistantMessage = derived(
  currentChatMessages,
  ($messages) => {
    for (let i = $messages.length - 1; i >= 0; i--) {
      if ($messages[i].role === "ASSISTANT") {
        return $messages[i];
      }
    }
    return null;
  },
);

// Helper functions for working with chat stores
export function setCurrentChat(chat: Chat | null) {
  currentChat.set(chat);

  // Reset message input when switching chats
  if (chat?.metadata?.promptDraft) {
    messageInput.set(chat.metadata.promptDraft);
  } else {
    messageInput.set("");
  }

  // Update chat settings from metadata
  if (chat?.metadata?.mode) {
    chatMode.set(chat.metadata.mode);
  }
  if (chat?.metadata?.model) {
    selectedModel.set(chat.metadata.model);
  }
}

export function clearCurrentChat() {
  currentChat.set(null);
  messageInput.set("");
  isSubmittingMessage.set(false);
}

export function updateMessageInput(value: string) {
  messageInput.set(value);
}

export function clearMessageInput() {
  messageInput.set("");
}

export function addMessageToCurrentChat(message: ChatMessage) {
  currentChat.update((chat) => {
    if (!chat) return chat;

    return {
      ...chat,
      messages: [...chat.messages, message],
      updatedAt: new Date(),
    };
  });
}

export function updateChatMetadata(metadata: Partial<Chat["metadata"]>) {
  currentChat.update((chat) => {
    if (!chat) return chat;

    return {
      ...chat,
      metadata: {
        ...chat.metadata,
        ...metadata,
      },
      updatedAt: new Date(),
    };
  });
}

// Extract file references from message content
export function extractFileReferences(
  content: string,
): Array<{ path: string; type: "file" | "image" }> {
  const references: Array<{ path: string; type: "file" | "image" }> = [];
  const regex =
    /#([^\s]+\.(png|jpg|jpeg|md|html|ts|js|tsx|jsx|json|css|svg|gif|pdf))/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      const filePath = match[1];
      const isImage = /\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i.test(filePath);
      references.push({ path: filePath, type: isImage ? "image" : "file" });
    }
  }

  return references;
}
