import { create } from "zustand";
import { Logger } from "tslog";
import { Chat, ChatUpdateData } from "@repo/events-core/event-types";

const logger = new Logger({ name: "chat-panel-store" });

interface ChatPanelState {
  currentChat: Chat | null;
  currentChatFilePath: string | null;
  isLoading: boolean;
  isResponding: boolean;
  messageInput: string;
  error: string | null;

  // Actions
  setCurrentChatFilePath: (filePath: string | null) => void;
  setCurrentChat: (chat: Chat) => void;
  clearCurrentChat: () => void;
  setLoading: (isLoading: boolean) => void;
  setResponding: (isResponding: boolean) => void;
  setMessageInput: (text: string) => void;
  setError: (error: string | null) => void;
  handleChatUpdate: (chat: Chat, update: ChatUpdateData) => void;
  isChatFilePathCurrent: (filePath: string) => boolean;
  isChatIdCurrent: (chatId: string) => boolean;
}

export const useChatPanelStore = create<ChatPanelState>((set, get) => ({
  currentChat: null,
  currentChatFilePath: null,
  isLoading: false,
  isResponding: false,
  messageInput: "",
  error: null,

  setCurrentChatFilePath: (filePath) => {
    logger.debug(`Setting current chat file path: ${filePath}`);
    set({ currentChatFilePath: filePath });
  },

  setCurrentChat: (chat) => {
    logger.debug(
      `Setting current chat: ${chat.id} with file path ${chat.filePath}`
    );
    set({
      currentChat: chat,
      currentChatFilePath: chat.filePath,
      error: null,
    });
  },

  clearCurrentChat: () => {
    logger.debug("Clearing current chat");
    set({
      currentChat: null,
      currentChatFilePath: null,
    });
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

  handleChatUpdate: (chat, update) => {
    // Only update if this is the current chat
    if (get().currentChatFilePath !== chat.filePath) {
      logger.debug(
        `Ignoring update for non-current chat file. Current: ${get().currentChatFilePath}, Update for: ${chat.filePath}`
      );
      return;
    }

    logger.debug(
      `Handling update of type: ${update.kind} for current chat ${chat.id}`
    );

    switch (update.kind) {
      case "MESSAGE_ADDED":
        logger.debug(`Message added from ${update.message?.role}`);
        break;
      case "ARTIFACT_ADDED":
        logger.debug(`Artifact added: ${update.artifact?.id}`);
        break;
      case "METADATA_UPDATED":
        logger.debug("Chat metadata updated");
        break;
    }

    set({ currentChat: chat });
  },

  isChatFilePathCurrent: (filePath) => {
    return get().currentChatFilePath === filePath;
  },

  isChatIdCurrent: (chatId) => {
    return get().currentChat?.id === chatId;
  },
}));

// Helper functions
export const ChatPanelStoreHelpers = {
  getCurrentChatId: (): string | null => {
    const currentChat = useChatPanelStore.getState().currentChat;
    return currentChat?.id || null;
  },

  getCurrentChatFilePath: (): string | null => {
    return useChatPanelStore.getState().currentChatFilePath;
  },

  isCurrentChatActive: (): boolean => {
    const currentChat = useChatPanelStore.getState().currentChat;
    return currentChat?.status === "ACTIVE";
  },

  getCurrentChatMode: (): string | null => {
    const currentChat = useChatPanelStore.getState().currentChat;
    return currentChat?.metadata?.mode || null;
  },
};
