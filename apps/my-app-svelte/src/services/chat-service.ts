// apps/my-app-svelte/src/services/chat-service.ts
import { Logger } from "tslog";
import { get } from "svelte/store";
import { trpcClient } from "../lib/trpc-client";
import { currentChat, messageInput } from "../stores/chat-store";
import { projectFolders } from "../stores/project-store";
import { selectFile, expandParentDirectories } from "../stores/tree-store";
import { setLoading, showToast } from "../stores/ui-store";
import { projectService } from "./project-service";

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "FUNCTION_EXECUTOR";
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface Chat {
  id: string;
  absoluteFilePath: string;
  messages: ChatMessage[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    title?: string;
    mode?: "chat" | "agent";
    model?: string;
    promptDraft?: string;
  };
}

interface ChatUpdatedEvent {
  chatId: string;
  updateType: "MESSAGE_ADDED" | "METADATA_UPDATED" | "AI_RESPONSE_ADDED";
  update: {
    message?: ChatMessage;
    metadata?: any;
  };
  chat: Chat;
}

class ChatService {
  private logger = new Logger({ name: "ChatService" });
  private draftSaveTimeouts = new Map<string, NodeJS.Timeout>();

  async createEmptyChat(targetDirectoryPath: string) {
    setLoading("createChat", true);

    try {
      this.logger.info("Creating empty chat in:", targetDirectoryPath);
      const newChat = await trpcClient.chat.createEmptyChat.mutate({
        targetDirectoryAbsolutePath: targetDirectoryPath,
      });

      currentChat.set(newChat);
      showToast("Chat created successfully", "success");
      this.logger.info("Empty chat created:", newChat.id);

      // Expand parent directories and select the newly created chat file
      expandParentDirectories(newChat.absoluteFilePath);
      selectFile(newChat.absoluteFilePath);

      // Refresh file tree to show the newly created chat file
      await this.refreshProjectTreeForFile(newChat.absoluteFilePath);

      return newChat;
    } catch (error) {
      this.logger.error("Failed to create empty chat:", error);
      showToast(
        `Failed to create chat: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    } finally {
      setLoading("createChat", false);
    }
  }

  async createChat(
    targetDirectoryPath: string,
    newTask: boolean = false,
    mode: "chat" | "agent" = "chat",
    knowledge: string[] = [],
    prompt?: string,
    model: string = "default",
  ) {
    setLoading("createChat", true);

    try {
      this.logger.info("Creating chat in:", targetDirectoryPath);
      const newChat = await trpcClient.chat.createChat.mutate({
        targetDirectoryAbsolutePath: targetDirectoryPath,
        newTask,
        mode,
        knowledge,
        prompt,
        model,
      });

      currentChat.set(newChat);
      showToast("Chat created successfully", "success");
      this.logger.info("Chat created:", newChat.id);

      // Refresh file tree to show the newly created chat file
      await this.refreshProjectTreeForFile(newChat.absoluteFilePath);

      return newChat;
    } catch (error) {
      this.logger.error("Failed to create chat:", error);
      showToast(
        `Failed to create chat: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    } finally {
      setLoading("createChat", false);
    }
  }

  async openChatFile(filePath: string) {
    setLoading("openChat", true);

    try {
      this.logger.info("Opening chat file:", filePath);
      const chat = await trpcClient.chat.openChatFile.query({
        filePath,
      });

      currentChat.set(chat);

      // Restore prompt draft if exists
      if (chat.metadata?.promptDraft) {
        messageInput.set(chat.metadata.promptDraft);
      } else {
        messageInput.set("");
      }

      this.logger.info("Chat file opened:", chat.id);
      return chat;
    } catch (error) {
      this.logger.error("Failed to open chat file:", error);
      showToast(
        `Failed to open chat: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    } finally {
      setLoading("openChat", false);
    }
  }

  async submitMessage(
    chatId: string,
    message: string,
    attachments?: Array<{ fileName: string; content: string }>,
  ) {
    setLoading("submitMessage", true);

    try {
      this.logger.info("Submitting message to chat:", chatId);
      const updatedChat = await trpcClient.chat.submitMessage.mutate({
        chatId,
        message,
        attachments,
      });

      currentChat.set(updatedChat);
      messageInput.set(""); // Clear input after successful send
      showToast("Message sent successfully", "success");
      this.logger.info("Message submitted successfully");

      return updatedChat;
    } catch (error) {
      this.logger.error("Failed to submit message:", error);
      showToast(
        `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    } finally {
      setLoading("submitMessage", false);
    }
  }

  async getAllChats() {
    setLoading("loadChats", true);

    try {
      this.logger.info("Loading all chats...");
      const chats = await trpcClient.chat.getAll.query();
      this.logger.info(`Loaded ${chats.length} chats`);
      return chats;
    } catch (error) {
      this.logger.error("Failed to load chats:", error);
      showToast(
        `Failed to load chats: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    } finally {
      setLoading("loadChats", false);
    }
  }

  savePromptDraft(chatId: string, draft: string) {
    // Clear existing timeout for this chat
    const existingTimeout = this.draftSaveTimeouts.get(chatId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to save draft after 1.5 seconds of inactivity
    const timeout = setTimeout(async () => {
      try {
        await trpcClient.chat.updatePromptDraft.mutate({
          chatId,
          promptDraft: draft,
        });
        this.logger.debug("Prompt draft saved for chat:", chatId);
      } catch (error) {
        this.logger.error("Failed to save prompt draft:", error);
      } finally {
        this.draftSaveTimeouts.delete(chatId);
      }
    }, 1500);

    this.draftSaveTimeouts.set(chatId, timeout);
  }

  // Event handlers
  handleChatEvent(event: ChatUpdatedEvent) {
    this.logger.debug("Handling chat event:", event.updateType, event.chatId);

    // Update current chat if it matches the event
    currentChat.update((chat) => {
      if (chat && chat.id === event.chatId) {
        switch (event.updateType) {
          case "AI_RESPONSE_ADDED":
            // AI responses only come through events
            showToast("AI response received", "success");
            return event.chat;
          case "METADATA_UPDATED":
            showToast("Chat metadata updated", "info");
            return event.chat;
          case "MESSAGE_ADDED":
            // User messages are handled by mutation response, skip event
            this.logger.debug(
              "User message event - already handled by mutation",
            );
            return chat;
          default:
            return event.chat;
        }
      }
      return chat;
    });
  }

  /**
   * Find the corresponding project folder based on file path and refresh its file tree
   */
  private async refreshProjectTreeForFile(filePath: string) {
    try {
      const folders = get(projectFolders);
      const affectedFolder = folders.find((folder) =>
        filePath.startsWith(folder.path),
      );

      if (affectedFolder) {
        this.logger.debug(
          "Refreshing project tree for folder:",
          affectedFolder.name,
        );

        await projectService.refreshFolderTree(affectedFolder.id);

        this.logger.debug("Project tree refreshed successfully");
      } else {
        this.logger.warn("No project folder found for file:", filePath);
      }
    } catch (error) {
      this.logger.error("Failed to refresh project tree:", error);
      // Don't show error notification as this is a background operation
    }
  }

  // Cleanup draft timeouts when service is destroyed
  cleanup() {
    this.draftSaveTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.draftSaveTimeouts.clear();
  }
}

export const chatService = new ChatService();
