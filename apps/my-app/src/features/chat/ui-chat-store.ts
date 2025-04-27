// chat-store.ts
import { create } from "zustand";
import { Chat, ChatMessage } from "@repo/events-core/event-types";

export interface ChatState {
  // Current chat data
  currentChat: Chat | null;
  isLoading: boolean;
  error: string | null;

  // UI state
  isPanelVisible: boolean;
  isNewChatModalOpen: boolean;

  // Actions
  setCurrentChat: (chat: Chat | null) => void;
  appendMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // UI actions
  showChatPanel: () => void;
  hideChatPanel: () => void;
  showNewChatModal: () => void;
  hideNewChatModal: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  // Current chat data
  currentChat: null,
  isLoading: false,
  error: null,

  // UI state
  isPanelVisible: false,
  isNewChatModalOpen: false,

  // Actions
  setCurrentChat: (chat) => set({ currentChat: chat }),
  appendMessage: (message) =>
    set((state) => {
      if (!state.currentChat) return state;

      return {
        currentChat: {
          ...state.currentChat,
          messages: [...state.currentChat.messages, message],
        },
      };
    }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      currentChat: null,
      isLoading: false,
      error: null,
      isPanelVisible: false,
      isNewChatModalOpen: false,
    }),

  // UI actions
  showChatPanel: () => set({ isPanelVisible: true }),
  hideChatPanel: () => set({ isPanelVisible: false }),
  showNewChatModal: () => set({ isNewChatModalOpen: true }),
  hideNewChatModal: () => set({ isNewChatModalOpen: false }),
}));
