// apps/my-app-trpc-2/src/components/chat-panel.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import {
  Send,
  Paperclip,
  ChevronDown,
  ChatDots,
  Pencil,
  Copy,
  ThreeDots,
  HouseDoor,
  ChevronRight,
  Download,
  Lightbulb,
  FileEarmark,
} from "react-bootstrap-icons";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as Select from "@radix-ui/react-select";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTRPC } from "../lib/trpc";
import { useAppStore } from "../store/app-store";
import { useToast } from "./toast-provider";

// Simple debounce implementation (no external dependency needed)
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Local type definitions
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
    promptDraft?: string;
  };
}

const ChatModeSelect: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
}> = ({ value, onValueChange }) => (
  <Select.Root value={value} onValueChange={onValueChange}>
    <Select.Trigger className="bg-panel border-border hover:bg-hover focus:border-accent text-muted inline-flex min-w-[80px] items-center justify-center gap-1 rounded border px-3 py-1 text-xs focus:outline-none">
      <Select.Value />
      <Select.Icon>
        <ChevronDown className="text-xs" />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="bg-panel border-border overflow-hidden rounded border shadow-lg">
        <Select.Viewport className="p-1">
          <Select.Item
            value="chat"
            className="hover:bg-hover focus:bg-hover text-foreground relative flex cursor-pointer items-center rounded px-6 py-2 text-sm outline-none"
          >
            <Select.ItemText>Chat</Select.ItemText>
          </Select.Item>
          <Select.Item
            value="agent"
            className="hover:bg-hover focus:bg-hover text-foreground relative flex cursor-pointer items-center rounded px-6 py-2 text-sm outline-none"
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
    <Select.Trigger className="bg-panel border-border hover:bg-hover focus:border-accent text-muted inline-flex min-w-[120px] items-center justify-center gap-1 rounded border px-3 py-1 text-xs focus:outline-none">
      <Select.Value />
      <Select.Icon>
        <ChevronDown className="text-xs" />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="bg-panel border-border overflow-hidden rounded border shadow-lg">
        <Select.Viewport className="p-1">
          <Select.Item
            value="claude"
            className="hover:bg-hover focus:bg-hover text-foreground relative flex cursor-pointer items-center rounded px-6 py-2 text-sm outline-none"
          >
            <Select.ItemText>Claude 3.7</Select.ItemText>
          </Select.Item>
          <Select.Item
            value="gemini"
            className="hover:bg-hover focus:bg-hover text-foreground relative flex cursor-pointer items-center rounded px-6 py-2 text-sm outline-none"
          >
            <Select.ItemText>Gemini 2.5 Pro</Select.ItemText>
          </Select.Item>
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);

const MessageActions: React.FC<{
  message: ChatMessage;
  isUserMessage: boolean;
}> = ({ message, isUserMessage }) => {
  const { showToast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    showToast("Message copied to clipboard", "success");
  };

  const handleEdit = () => {
    showToast("Edit functionality not implemented yet", "info");
  };

  const moreMenuItems = [
    {
      label: "Clone Chat",
      action: () => showToast("Clone chat functionality coming soon", "info"),
    },
    {
      label: "What's Next",
      action: () => showToast("What's next analysis coming soon", "info"),
    },
    {
      label: "Summarize",
      action: () => showToast("Summarize functionality coming soon", "info"),
    },
    {
      label: "Retry",
      action: () => showToast("Retry functionality coming soon", "info"),
    },
  ];

  return (
    <div
      className={`mt-1 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100 ${isUserMessage ? "mr-2" : "ml-7"}`}
    >
      <button
        onClick={handleEdit}
        className="text-muted hover:text-accent"
        title="Edit"
      >
        <Pencil className="text-sm" />
      </button>
      <button
        onClick={handleCopy}
        className="text-muted hover:text-accent"
        title="Copy"
      >
        <Copy className="text-sm" />
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="text-muted hover:text-accent" title="More">
            <ThreeDots className="text-sm" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="bg-panel border-border z-50 min-w-[180px] rounded-md border shadow-lg"
            sideOffset={5}
          >
            {moreMenuItems.map((item) => (
              <DropdownMenu.Item
                key={item.label}
                className="hover:bg-hover text-foreground flex cursor-pointer items-center px-3 py-2 text-sm outline-none"
                onClick={item.action}
              >
                {item.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};

const ArtifactButton: React.FC<{
  fileName: string;
  version?: string;
}> = ({ fileName, version }) => {
  const { showToast } = useToast();

  const handleDownload = () => {
    showToast(`Download ${fileName} functionality coming soon`, "info");
  };

  const handlePreview = () => {
    showToast(`Preview ${fileName} functionality coming soon`, "info");
  };

  return (
    <div className="mt-2">
      <button
        onClick={handlePreview}
        className="border-border bg-panel hover:bg-hover text-foreground flex items-center gap-2 rounded border px-3 py-1 text-sm font-medium"
      >
        <FileEarmark className="text-sm" />
        {fileName}
        {version && <span className="text-muted ml-1 text-xs">{version}</span>}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="text-muted hover:text-accent ml-2"
          title="Download"
        >
          <Download className="text-sm" />
        </button>
      </button>
    </div>
  );
};

const MessageBubble: React.FC<{
  message: ChatMessage;
  isUserMessage: boolean;
}> = ({ message, isUserMessage }) => {
  // Detect artifacts in message (placeholder logic)
  const hasArtifacts =
    message.content.includes("artifact") ||
    message.content.includes("wireframe");

  // Detect file references in message
  const fileReferences =
    message.content.match(/#[\w\-\.\/]+\.(png|jpg|jpeg|md|html|ts|js)/g) || [];

  if (isUserMessage) {
    return (
      <div className="group flex flex-col items-end">
        <div className="bg-accent/20 border-accent/30 text-foreground ml-auto max-w-xl rounded-lg border px-4 py-2">
          {/* Render file references as clickable links */}
          {fileReferences.length > 0 && (
            <div className="mb-2">
              {fileReferences.map((ref, index) => (
                <button
                  key={index}
                  className="text-accent hover:text-accent/80 ml-1 text-sm"
                  onClick={() => console.log("Open file:", ref)}
                >
                  {ref}
                </button>
              ))}
            </div>
          )}
          <div className="leading-normal">{message.content}</div>
        </div>
        <MessageActions message={message} isUserMessage={true} />
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-start">
      <div className="mb-0.5 flex items-center gap-2">
        <span className="bg-accent flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white">
          C
        </span>
        <span className="text-muted text-xs font-medium">Claude Sonnet 4</span>
      </div>
      <div className="text-foreground pl-7 leading-normal">
        {message.content}

        {/* Placeholder artifacts */}
        {hasArtifacts && (
          <ArtifactButton fileName="wireframe.html" version="v3" />
        )}
      </div>
      <MessageActions message={message} isUserMessage={false} />
    </div>
  );
};

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
      // staleTime: 1000 * 60, // 1 minute
      staleTime: 0, // Disable caching
      gcTime: 0,
    },
  );

  // Load chat when selectedChatFile changes
  const {
    data: loadedChat,
    isLoading,
    error: chatLoadError,
    refetch: refetchChatFile,
  } = useQuery(openChatFileQueryOptions);

  // Update prompt draft mutation
  const updatePromptDraftMutation = useMutation(
    trpc.chat.updatePromptDraft.mutationOptions({
      onError: (error) => {
        console.error("Failed to save prompt draft:", error);
        showToast("Failed to save draft", "error");
      },
    }),
  );

  // Create debounced save function with proper cleanup
  const debouncedSavePromptDraft = useMemo(
    () =>
      debounce((chatId: string, promptDraft: string) => {
        updatePromptDraftMutation.mutate({
          chatId,
          promptDraft,
        });
      }, 1500), // 1.5 seconds delay
    [updatePromptDraftMutation],
  );

  // Handle message input changes with automatic draft saving
  const handleMessageInputChange = useCallback(
    (value: string) => {
      setMessageInput(value);

      // Auto-save draft if chat exists and input is not empty
      if (chat && value.trim()) {
        debouncedSavePromptDraft(chat.id, value);
      }
    },
    [chat, debouncedSavePromptDraft],
  );

  // Subscribe to chat events
  const chatEventsSubscription = useSubscription(
    trpc.event.chatEvents.subscriptionOptions(
      { lastEventId: null },
      {
        enabled: !!chat,
        onData: (event) => {
          if (event.data.chatId === chat?.id) {
            console.log(
              "Chat event received:",
              event.data.updateType,
              event.data,
            );

            // Only handle events that aren't already handled by mutations
            switch (event.data.updateType) {
              case "AI_RESPONSE_ADDED":
                // AI responses only come through events, not mutations
                setChat(event.data.chat);
                showToast("AI response received", "success");
                break;
              case "METADATA_UPDATED":
                // Only update if it's not from our own mutation
                showToast("Chat metadata updated", "info");
                break;
              case "MESSAGE_ADDED":
                // Skip - user messages are already handled by mutation response
                console.log("User message event - already handled by mutation");
                break;
            }

            // queryClient.invalidateQueries({
            //   queryKey: trpc.chat.openChatFile.queryKey({
            //     filePath: event.data.chat.absoluteFilePath,
            //   }),
            // });
          }
        },
        onError: (error) => {
          console.error("Chat event subscription error:", error);
          showToast(`Chat subscription error: ${error.message}`, "error");
        },
        onConnectionStateChange: (state) => {
          console.log("Chat subscription connection state:", state);
        },
      },
    ),
  );

  // Handle data changes
  useEffect(() => {
    if (loadedChat) {
      setChat(loadedChat);
      if (loadedChat.metadata?.mode) {
        setChatMode(loadedChat.metadata.mode);
      }
      if (loadedChat.metadata?.model) {
        setModel(loadedChat.metadata.model);
      }
      // Restore promptDraft when opening chat
      if (loadedChat.metadata?.promptDraft) {
        setMessageInput(loadedChat.metadata.promptDraft);
      } else {
        setMessageInput("");
      }
    }
  }, [loadedChat]);

  // Handle chat loading errors
  useEffect(() => {
    if (chatLoadError) {
      showToast(`Failed to load chat: ${chatLoadError.message}`, "error");
    }
  }, [chatLoadError, showToast]);

  // Cleanup: Save draft when component unmounts or chat changes
  useEffect(() => {
    return () => {
      // Save any pending draft when chat changes or component unmounts
      if (messageInput.trim() && chat) {
        updatePromptDraftMutation.mutate({
          chatId: chat.id,
          promptDraft: messageInput,
        });
      }
    };
  }, [chat?.id]); // Only trigger when chat ID changes

  // Submit message mutation
  const submitMessageMutationOptions = trpc.chat.submitMessage.mutationOptions({
    onSuccess: (updatedChat) => {
      setChat(updatedChat);
      setMessageInput("");
      showToast("Message sent successfully", "success");

      // queryClient.invalidateQueries({
      //   queryKey: trpc.chat.openChatFile.queryKey({
      //     filePath: updatedChat.absoluteFilePath,
      //   }),
      // });
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      showToast(
        `Failed to send message: ${error.message || "Unknown error"}`,
        "error",
      );

      setChat((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter((m) => !m.id.startsWith("temp-")),
            }
          : null,
      );
    },
  });

  const submitMessageMutation = useMutation(submitMessageMutationOptions);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !chat) return;

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
        : null,
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

  const handleWhatsNext = () => {
    showToast(
      "What's Next: Refactor your utils.ts for better modularity.",
      "info",
    );
  };

  const handleSummarize = () => {
    showToast("Chat summary functionality coming soon", "info");
  };

  // const invalidateChatQueries = () => {
  //   if (selectedChatFile) {
  //     const queryKey = trpc.chat.openChatFile.queryKey({
  //       filePath: selectedChatFile,
  //     });
  //     queryClient.invalidateQueries({ queryKey });
  //   }
  // };

  if (!selectedChatFile) {
    return (
      <div className="bg-background flex flex-1 items-center justify-center">
        <div className="text-muted text-center">
          <ChatDots className="mx-auto mb-4 text-5xl" />
          <p>Select a chat file to start</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted">Loading chat...</div>
      </div>
    );
  }

  if (chatLoadError) {
    return (
      <div className="bg-background flex flex-1 items-center justify-center">
        <div className="text-center text-red-400">
          <ChatDots className="mx-auto mb-4 text-5xl" />
          <p className="mb-2">Failed to load chat</p>
          <button
            onClick={() =>
              queryClient.refetchQueries({
                queryKey: openChatFileQueryOptions.queryKey,
              })
            }
            className="rounded border border-red-600/40 bg-red-600/20 px-3 py-1 text-sm text-red-400 hover:bg-red-600/30"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-w-0 flex-1 flex-col">
      {/* Breadcrumb Header */}
      <header className="bg-surface border-border flex h-12 items-center gap-2 border-b px-4">
        <HouseDoor className="text-muted text-sm" />
        <span className="text-muted text-xs">
          {selectedChatFile.split("/").slice(-3, -1).join("")}
        </span>
        <ChevronRight className="text-muted text-xs" />
        <span className="text-muted text-xs">
          {selectedChatFile.split("/").pop()}
        </span>
        <div className="ml-auto flex items-center space-x-2">
          <button
            onClick={() => refetchChatFile()}
            className="bg-panel hover:bg-hover text-muted rounded px-2 py-1 text-xs"
          >
            🔄 Refresh
          </button>
          <div className="text-muted text-xs">
            {chatEventsSubscription.status === "pending" && (
              <span className="text-green-400">🟢 Live</span>
            )}
            {chatEventsSubscription.status === "connecting" && (
              <span className="text-yellow-400">🟡 Connecting</span>
            )}
            {chatEventsSubscription.status === "error" && (
              <span className="text-red-400">🔴 Disconnected</span>
            )}
            {chatEventsSubscription.status === "idle" && (
              <span className="text-muted">⚪ Idle</span>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="bg-background flex-1 space-y-5 overflow-y-auto px-8 py-6">
        {chat?.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isUserMessage={message.role === "USER"}
          />
        ))}
      </div>

      {/* Input Area */}
      <footer className="border-border bg-panel border-t px-6 py-4">
        <div className="relative">
          <textarea
            value={messageInput}
            onChange={(e) => handleMessageInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="bg-input-background border-input-border focus:border-accent placeholder-muted text-foreground w-full resize-none rounded-md border px-3 py-3 text-[15px] focus:outline-none"
            rows={3}
          />
        </div>

        {/* Controls below input */}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button className="text-muted hover:text-accent" title="Attach">
            <Paperclip className="text-base" />
          </button>

          <ChatModeSelect value={chatMode} onValueChange={setChatMode} />
          <ModelSelect value={model} onValueChange={setModel} />

          <button
            onClick={handleWhatsNext}
            className="text-muted hover:text-accent flex items-center text-xs"
          >
            <Lightbulb className="mr-1 text-sm" />
            What&apos;s next
          </button>

          <button
            onClick={handleSummarize}
            className="text-muted hover:text-accent flex items-center text-xs"
          >
            <FileEarmark className="mr-1 text-sm" />
            Summarize
          </button>

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || submitMessageMutation.isPending}
            className="hover:bg-accent/80 text-muted ml-auto rounded px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            title="Send"
          >
            <Send className="text-base" />
          </button>
        </div>
      </footer>
    </div>
  );
};
