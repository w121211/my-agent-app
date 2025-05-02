import { create } from "zustand";
import { Logger } from "tslog";
import { Chat, ChatMessage, ChatMetadata } from "@repo/events-core/event-types";

const logger = new Logger({ name: "chat-panel-store" });

interface ChatPanelState {
  currentChat: Chat | null;
  isLoading: boolean;
  isResponding: boolean;
  messageInput: string;
  error: string | null;

  // Actions
  setCurrentChat: (chat: Chat) => void;
  clearCurrentChat: () => void;
  setLoading: (isLoading: boolean) => void;
  setResponding: (isResponding: boolean) => void;
  setMessageInput: (text: string) => void;
  setError: (error: string | null) => void;
  appendMessage: (message: ChatMessage) => void;
  updateMetadata: (metadata: Partial<ChatMetadata>) => void;
}

export const useChatPanelStore = create<ChatPanelState>((set, get) => ({
  currentChat: null,
  isLoading: false,
  isResponding: false,
  messageInput: "",
  error: null,

  setCurrentChat: (chat) => {
    logger.debug(`Setting current chat: ${chat.id}`);
    set({ currentChat: chat, error: null });
  },

  clearCurrentChat: () => {
    logger.debug("Clearing current chat");
    set({ currentChat: null });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setResponding: (isResponding) => set({ isResponding }),

  setMessageInput: (text) => set({ messageInput: text }),

  setError: (error) => {
    if (error) {
      logger.error(`Chat panel error: ${error}`);
    }
    set({ error });
  },

  appendMessage: (message) => {
    const currentChat = get().currentChat;
    if (!currentChat) {
      logger.warn("Cannot append message: no current chat");
      return;
    }

    logger.debug(
      `Appending message to chat ${currentChat.id} from ${message.role}`
    );

    set({
      currentChat: {
        ...currentChat,
        messages: [...currentChat.messages, message],
        updatedAt: new Date(),
      },
    });
  },

  updateMetadata: (metadata) => {
    const currentChat = get().currentChat;
    if (!currentChat) {
      logger.warn("Cannot update metadata: no current chat");
      return;
    }

    set({
      currentChat: {
        ...currentChat,
        metadata: {
          ...currentChat.metadata,
          ...metadata,
        },
        updatedAt: new Date(),
      },
    });
  },
}));

// Helper functions for working with the chat store
export const ChatPanelStoreHelpers = {
  /**
   * Get the current chat ID from the store
   */
  getCurrentChatId: (): string | null => {
    const currentChat = useChatPanelStore.getState().currentChat;
    return currentChat?.id || null;
  },

  /**
   * Check if the current chat is active
   */
  isCurrentChatActive: (): boolean => {
    const currentChat = useChatPanelStore.getState().currentChat;
    return currentChat?.status === "ACTIVE";
  },

  /**
   * Get the current chat mode (chat or agent)
   */
  getCurrentChatMode: (): string | null => {
    const currentChat = useChatPanelStore.getState().currentChat;
    return currentChat?.metadata?.mode || null;
  },
};
