import { create } from 'zustand';

export interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface ChatStore {
  messages: Message[];
  currentPath: string | null;
  inputMessage: string;
  addMessage: (message: Message) => void;
  setCurrentPath: (path: string) => void;
  setInputMessage: (message: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  currentPath: null,
  inputMessage: '',
  
  addMessage: (message) => 
    set((state) => ({
      messages: [...state.messages, message]
    })),
    
  setCurrentPath: (path) => 
    set(() => ({
      currentPath: path,
      messages: [] // Clear messages when changing path
    })),
    
  setInputMessage: (message) =>
    set(() => ({
      inputMessage: message
    })),
    
  clearMessages: () =>
    set(() => ({
      messages: []
    }))
}));