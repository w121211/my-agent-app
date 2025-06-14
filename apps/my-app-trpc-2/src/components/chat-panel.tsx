// apps/my-app-trpc-2/src/components/chat-panel.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import { Send, Paperclip, Zap, MessageSquare, ChevronDown } from "lucide-react";
import React, { useState, useEffect } from "react";
import * as Select from "@radix-ui/react-select";
import { useTRPC } from "../lib/trpc";
import { useAppStore } from "../store/app-store";
import { useToast } from "./toast-provider";

// Local type definitions (in real app would be imported)
interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "FUNCTION_EXECUTOR";
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface Chat {
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
  };
}

const ChatModeSelect: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
}> = ({ value, onValueChange }) => (
  <Select.Root value={value} onValueChange={onValueChange}>
    <Select.Trigger className="inline-flex items-center justify-between gap-1 rounded px-3 py-1 text-sm bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[80px]">
      <Select.Value />
      <Select.Icon>
        <ChevronDown size={12} />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="overflow-hidden bg-white rounded border border-gray-200 shadow-lg">
        <Select.Viewport className="p-1">
          <Select.Item
            value="chat"
            className="relative flex items-center px-6 py-2 text-sm rounded cursor-pointer hover:bg-gray-100 focus:bg-gray-100 outline-none"
          >
            <Select.ItemText>Chat</Select.ItemText>
          </Select.Item>
          <Select.Item
            value="agent"
            className="relative flex items-center px-6 py-2 text-sm rounded cursor-pointer hover:bg-gray-100 focus:bg-gray-100 outline-none"
          >
            <Select.ItemText>Agent</Select.ItemText>
          </Select.Item>
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);

const ModelSelect: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
}> = ({ value, onValueChange }) => (
  <Select.Root value={value} onValueChange={onValueChange}>
    <Select.Trigger className="inline-flex items-center justify-between gap-1 rounded px-3 py-1 text-sm bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[80px]">
      <Select.Value />
      <Select.Icon>
        <ChevronDown size={12} />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="overflow-hidden bg-white rounded border border-gray-200 shadow-lg">
        <Select.Viewport className="p-1">
          <Select.Item
            value="claude"
            className="relative flex items-center px-6 py-2 text-sm rounded cursor-pointer hover:bg-gray-100 focus:bg-gray-100 outline-none"
          >
            <Select.ItemText>Claude</Select.ItemText>
          </Select.Item>
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);

export const ChatPanel: React.FC = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { selectedChatFile } = useAppStore();
  const [messageInput, setMessageInput] = useState("");
  const [chat, setChat] = useState<Chat | null>(null);
  const [chatMode, setChatMode] = useState("chat");
  const [model, setModel] = useState("claude");

  // Create query options for opening chat file
  const openChatFileQueryOptions = trpc.chat.openChatFile.queryOptions(
    { filePath: selectedChatFile! },
    {
      enabled: !!selectedChatFile,
      staleTime: 1000 * 60, // 1 minute
    }
  );

  // Load chat when selectedChatFile changes
  const {
    data: loadedChat,
    isLoading,
    error: chatLoadError,
  } = useQuery(openChatFileQueryOptions);

  // Subscribe to chat events
  const chatEventsSubscription = useSubscription(
    trpc.event.chatEvents.subscriptionOptions(
      { lastEventId: null },
      {
        enabled: !!chat, // Only enable when we have a chat loaded
        onData: (event) => {
          // Handle the chat event - only update if it's for the current chat
          if (event.data.chatId === chat?.id) {
            console.log(
              "Chat event received:",
              event.data.updateType,
              event.data
            );

            // Update the chat with the new data from the event
            setChat(event.data.chat);

            // Show toast for different event types
            switch (event.data.updateType) {
              case "MESSAGE_ADDED":
                // Don't show toast for user messages (they added them)
                break;
              case "AI_RESPONSE_ADDED":
                showToast("AI response received", "success");
                break;
              case "METADATA_UPDATED":
                showToast("Chat metadata updated", "info");
                break;
            }

            // Invalidate the chat query to keep it in sync
            queryClient.invalidateQueries({
              queryKey: trpc.chat.openChatFile.queryKey({
                filePath: selectedChatFile!,
              }),
            });
          }
        },
        onError: (error) => {
          console.error("Chat event subscription error:", error);
          showToast(`Chat subscription error: ${error.message}`, "error");
        },
        onConnectionStateChange: (state) => {
          console.log("Chat subscription connection state:", state);
        },
      }
    )
  );

  // Handle data changes with useEffect instead of onSuccess
  useEffect(() => {
    if (loadedChat) {
      setChat(loadedChat);
      // Update local state from chat metadata
      if (loadedChat.metadata?.mode) {
        setChatMode(loadedChat.metadata.mode);
      }
      if (loadedChat.metadata?.model) {
        setModel(loadedChat.metadata.model);
      }
    }
  }, [loadedChat]);

  // Handle chat loading errors
  useEffect(() => {
    if (chatLoadError) {
      showToast(`Failed to load chat: ${chatLoadError.message}`, "error");
    }
  }, [chatLoadError, showToast]);

  // UPDATED: Submit message mutation now expects Chat directly
  const submitMessageMutationOptions = trpc.chat.submitMessage.mutationOptions({
    onSuccess: (updatedChat) => {
      // updatedChat is now Chat directly, not wrapped in success object
      setChat(updatedChat);
      setMessageInput("");
      showToast("Message sent successfully", "success");

      // Invalidate and refetch the chat query to ensure consistency
      queryClient.invalidateQueries({
        queryKey: trpc.chat.openChatFile.queryKey({
          filePath: selectedChatFile!,
        }),
      });
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      showToast(
        `Failed to send message: ${error.message || "Unknown error"}`,
        "error"
      );

      // Remove temp message on error
      setChat((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter((m) => !m.id.startsWith("temp-")),
            }
          : null
      );
    },
  });

  // Submit message mutation
  const submitMessageMutation = useMutation(submitMessageMutationOptions);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !chat) return;

    // Immediately add message to UI with temp ID
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content: messageInput,
      timestamp: new Date(),
    };

    setChat((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, tempMessage],
          }
        : null
    );

    try {
      await submitMessageMutation.mutateAsync({
        chatId: chat.id,
        message: messageInput,
      });
    } catch (error) {
      // Error handling is done in the mutation options
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper function to invalidate specific chat queries
  const invalidateChatQueries = () => {
    if (selectedChatFile) {
      const queryKey = trpc.chat.openChatFile.queryKey({
        filePath: selectedChatFile,
      });
      queryClient.invalidateQueries({ queryKey });
    }
  };

  if (!selectedChatFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <MessageSquare size={48} className="mx-auto mb-4" />
          <p>Select a chat file to start</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading chat...</div>
      </div>
    );
  }

  if (chatLoadError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-500">
          <MessageSquare size={48} className="mx-auto mb-4" />
          <p className="mb-2">Failed to load chat</p>
          <button
            onClick={() =>
              queryClient.refetchQueries({
                queryKey: openChatFileQueryOptions.queryKey,
              })
            }
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="text-sm text-gray-600 mb-1">
          🏠 Home {">"} 📁{" "}
          {selectedChatFile.split("/").slice(-3, -1).join(" > ")}
        </div>
        <div className="text-sm text-gray-600 flex items-center justify-between">
          <span>
            {">"} 💬 {selectedChatFile.split("/").pop()}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={invalidateChatQueries}
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              🔄 Refresh
            </button>
            <div className="text-xs text-gray-500">
              {chatEventsSubscription.status === "pending" && (
                <span className="text-green-600">🟢 Live</span>
              )}
              {chatEventsSubscription.status === "connecting" && (
                <span className="text-yellow-600">🟡 Connecting</span>
              )}
              {chatEventsSubscription.status === "error" && (
                <span className="text-red-600">🔴 Disconnected</span>
              )}
              {chatEventsSubscription.status === "idle" && (
                <span className="text-gray-400">⚪ Idle</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Knowledge Section */}
      {chat?.metadata?.mode && (
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <details className="group">
            <summary className="cursor-pointer font-medium text-gray-700 mb-2">
              ▼ Task Knowledge & Instruction
            </summary>
            <div className="bg-white border rounded p-3 text-sm">
              <div className="text-gray-600">
                &lt;task_knowledge&gt;
                <br />
                {/* Placeholder for task knowledge */}
                &lt;/task_knowledge&gt;
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chat?.messages.map((message) => (
          <div key={message.id} className="group">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                {message.role === "USER" ? "👤" : "🤖"}
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">
                  [{message.role}] {message.timestamp.toLocaleTimeString()}
                  {message.id.startsWith("temp-") && (
                    <span className="ml-2 text-orange-500">⏳ Sending...</span>
                  )}
                </div>
                <div className="prose prose-sm max-w-none">
                  {message.content}
                </div>
                {message.role === "ASSISTANT" && (
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-xs text-gray-500 hover:text-gray-700 mr-3">
                      copy
                    </button>
                    <button className="text-xs text-gray-500 hover:text-gray-700">
                      retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="space-y-3">
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Write a message..."
            className="w-full border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ChatModeSelect value={chatMode} onValueChange={setChatMode} />
              <ModelSelect value={model} onValueChange={setModel} />
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <Paperclip size={16} />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <Zap size={16} />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={
                  !messageInput.trim() || submitMessageMutation.isPending
                }
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <Send size={16} />
                <span>
                  {submitMessageMutation.isPending ? "Sending..." : "Send"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
