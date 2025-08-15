// apps/my-app-svelte/src/services/chat-service.ts
import { Logger } from "tslog";
import type {
  ChatSessionData,
  ChatMessage,
} from "@repo/events-core/services/chat-engine/chat-session-repository";
import type { ChatUpdatedEvent } from "@repo/events-core/services/chat-engine/events";
import { trpcClient } from "../lib/trpc-client.js";
import {
  chatState,
  setCurrentChat,
  clearCurrentChat,
  updateMessageInput,
  clearMessageInput,
} from "../stores/chat-store.svelte";
import { projectState } from "../stores/project-store.svelte.js";
import {
  selectFile,
  expandParentDirectories,
} from "../stores/tree-store.svelte";
import { setLoading, showToast } from "../stores/ui-store.svelte";
import { projectService } from "./project-service.js";

class ChatService {
  private logger = new Logger({ name: "ChatService" });
  private draftSaveTimeouts = new Map<string, NodeJS.Timeout>();

  async createEmptyChat(targetDirectoryPath: string) {
    setLoading("createChat", true);

    try {
      this.logger.info("Creating empty chat in:", targetDirectoryPath);
      const newChat = await trpcClient.chatClient.createNewChatSession.mutate({
        targetDirectory: targetDirectoryPath,
      });

      setCurrentChat(newChat);
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

  async openChatFile(filePath: string) {
    setLoading("openChat", true);

    try {
      this.logger.info("Opening chat file:", filePath);
      const chat = await trpcClient.chatClient.getChatSession.query({
        absoluteFilePath: filePath,
      });

      setCurrentChat(chat);

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

  async sendMesage(
    absoluteFilePath: string,
    chatSessionId: string,
    messageText: string,
    attachments?: Array<{ fileName: string; content: string }>,
  ) {
    setLoading("submitMessage", true);

    try {
      this.logger.info("Submitting message to chat:", chatSessionId);

      // Convert message and attachments to proper format
      let content: string | any[] = messageText;
      if (attachments && attachments.length > 0) {
        content = [
          { type: "text", text: messageText },
          ...attachments.map((att) => ({
            type: "text",
            text: `File: ${att.fileName}\n${att.content}`,
          })),
        ];
      }

      const result = await trpcClient.chatClient.sendMessage.mutate({
        absoluteFilePath,
        chatSessionId,
        message: {
          role: "user",
          content,
        },
      });

      // Update current chat with the returned session data
      setCurrentChat(result.updatedChatSession);
      clearMessageInput(); // Clear input after successful send
      showToast("Message sent successfully", "success");
      this.logger.info("Message submitted successfully");

      return result;
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
      // Note: This method needs to be implemented in the backend or use file system scanning
      // For now, we'll need to rely on the file explorer to show chat files
      this.logger.warn("getAllChats not implemented in new chat client router");
      return [];
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

  async confirmToolCall(
    absoluteFilePath: string,
    chatSessionId: string,
    toolCallId: string,
    outcome: "yes" | "no" | "yes_always",
  ) {
    try {
      this.logger.info("Confirming tool call:", toolCallId, outcome);
      const result = await trpcClient.chatClient.confirmToolCall.mutate({
        absoluteFilePath,
        chatSessionId,
        toolCallId,
        outcome,
      });
      
      // Update current chat with the returned session data
      setCurrentChat(result.updatedChatSession);
      this.logger.info("Tool call confirmed successfully");
      return result;
    } catch (error) {
      this.logger.error("Failed to confirm tool call:", error);
      showToast(
        `Failed to confirm tool call: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    }
  }

  async abortChat(absoluteFilePath: string, chatSessionId: string) {
    setLoading("abortChat", true);

    try {
      this.logger.info("Aborting chat:", chatSessionId);
      const result = await trpcClient.chatClient.abortChat.mutate({
        absoluteFilePath,
        chatSessionId,
      });
      this.logger.info("Chat aborted successfully");
      return result;
    } catch (error) {
      this.logger.error("Failed to abort chat:", error);
      showToast(
        `Failed to abort chat: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    } finally {
      setLoading("abortChat", false);
    }
  }

  async getAvailableModels() {
    setLoading("getModels", true);

    try {
      this.logger.info("Getting available models...");
      const models = await trpcClient.chatClient.getAvailableModels.query();
      this.logger.info(`Loaded ${models.length} models`);
      return models;
    } catch (error) {
      this.logger.error("Failed to get available models:", error);
      showToast(
        `Failed to get models: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    } finally {
      setLoading("getModels", false);
    }
  }

  async deleteChat(absoluteFilePath: string) {
    setLoading("deleteChat", true);

    try {
      this.logger.info("Deleting chat:", absoluteFilePath);
      const result = await trpcClient.chatClient.deleteChat.mutate({
        absoluteFilePath,
      });
      this.logger.info("Chat deleted successfully");

      // Clear current chat if it was the deleted one
      if (
        chatState.currentChat &&
        chatState.currentChat.absoluteFilePath === absoluteFilePath
      ) {
        clearCurrentChat();
      }

      // Refresh file tree
      await this.refreshProjectTreeForFile(absoluteFilePath);

      return result;
    } catch (error) {
      this.logger.error("Failed to delete chat:", error);
      showToast(
        `Failed to delete chat: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    } finally {
      setLoading("deleteChat", false);
    }
  }

  async rerunChat(absoluteFilePath: string, chatSessionId: string) {
    setLoading("rerunChat", true);

    try {
      this.logger.info("Re-running chat:", chatSessionId);
      const result = await trpcClient.chatClient.rerunChat.mutate({
        absoluteFilePath,
        chatSessionId,
      });
      this.logger.info("Chat re-run successfully");
      return result;
    } catch (error) {
      this.logger.error("Failed to re-run chat:", error);
      showToast(
        `Failed to re-run chat: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    } finally {
      setLoading("rerunChat", false);
    }
  }

  savePromptDraft(absoluteFilePath: string, draft: string) {
    // Clear existing timeout for this chat
    const existingTimeout = this.draftSaveTimeouts.get(absoluteFilePath);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to save draft after 1.5 seconds of inactivity
    const timeout = setTimeout(async () => {
      try {
        await trpcClient.chatClient.updateChat.mutate({
          absoluteFilePath,
          updates: {
            metadata: { promptDraft: draft },
          },
        });
        this.logger.debug("Prompt draft saved for chat:", absoluteFilePath);
      } catch (error) {
        this.logger.error("Failed to save prompt draft:", error);
      } finally {
        this.draftSaveTimeouts.delete(absoluteFilePath);
      }
    }, 1500);

    this.draftSaveTimeouts.set(absoluteFilePath, timeout);
  }

  // Event handlers
  handleChatEvent(event: ChatUpdatedEvent) {
    this.logger.debug("Handling chat event:", event.updateType, event.chatId);

    // Update current chat if it matches the event
    if (chatState.currentChat && chatState.currentChat.id === event.chatId) {
      switch (event.updateType) {
        case "AI_RESPONSE_STARTED":
          this.logger.debug("AI response started for chat:", event.chatId);
          setCurrentChat(event.chat);
          break;
        case "AI_RESPONSE_STREAMING":
          this.logger.debug("AI streaming content updated");
          setCurrentChat(event.chat);
          break;
        case "AI_RESPONSE_COMPLETED":
          this.logger.debug("AI response completed for chat:", event.chatId);
          setCurrentChat(event.chat);
          break;
        case "METADATA_UPDATED":
          this.logger.debug("Chat metadata updated");
          setCurrentChat(event.chat);
          break;
        case "MESSAGE_ADDED":
          // User messages are handled by mutation response, skip event
          this.logger.debug("User message event - already handled by mutation");
          break;
        case "STATUS_CHANGED":
          this.logger.debug("Chat status changed:", event.update.status);
          setCurrentChat(event.chat);
          break;
        default:
          setCurrentChat(event.chat);
      }
    }
  }

  /**
   * Find the corresponding project folder based on file path and refresh its file tree
   */
  private async refreshProjectTreeForFile(filePath: string) {
    try {
      const folders = projectState.projectFolders;
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
