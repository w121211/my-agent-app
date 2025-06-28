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
import React, { useState, useEffect } from "react";
import * as Select from "@radix-ui/react-select";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTRPC } from "../lib/trpc";
import { useAppStore } from "../store/app-store";
import { useToast } from "./toast-provider";

// Local type definitions
interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "FUNCTION_EXECUTOR";
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>; // More specific if possible, but Record<string, unknown> is safe for now
}

// Define ChatStatus locally or import if available from a shared types definition (not current project setup)
export type ChatStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

interface ChatMetadata {
  title?: string;
  mode?: "chat" | "agent";
  model?: string;
  promptDraft?: string; // Added for prompt auto-save
  // other metadata fields if any
}
interface Chat {
  id: string;
  absoluteFilePath: string;
  messages: ChatMessage[];
  status: ChatStatus; // Use the specific ChatStatus type
  createdAt: Date;
  updatedAt: Date;
  metadata?: ChatMetadata;
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
  const [chatMode, setChatMode] = useState("chat"); // Default, will be overwritten by chat metadata
  const [model, setModel] = useState("default"); // Default, will be overwritten by chat metadata
  const inputRef = React.useRef<HTMLTextAreaElement>(null); // Ref for auto-focus

  // Create query options for opening chat file
  const openChatFileQueryOptions = trpc.chat.openChatFile.queryOptions(
    { filePath: selectedChatFile! },
    {
      enabled: !!selectedChatFile,
      staleTime: 1000 * 60, // 1 minute
    },
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
        enabled: !!chat,
        onData: (event) => {
          if (event.data.chatId === chat?.id) {
            console.log(
              "Chat event received:",
              event.data.updateType,
              event.data,
            );
            setChat(event.data.chat);

            switch (event.data.updateType) {
              case "AI_RESPONSE_ADDED":
                showToast("AI response received", "success");
                break;
              case "METADATA_UPDATED":
                showToast("Chat metadata updated", "info");
                break;
            }

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
      // Restore promptDraft content
      if (loadedChat.metadata?.promptDraft) {
        setMessageInput(loadedChat.metadata.promptDraft);
      } else {
        // If no promptDraft is stored (e.g. for older chats or after sending one), ensure input is clear
        setMessageInput("");
      }

      // Auto-focus for DRAFT chats
      if (loadedChat.status === "DRAFT") {
        inputRef.current?.focus();
      }
    }
  }, [loadedChat]);

  // Handle chat loading errors
  useEffect(() => {
    if (chatLoadError) {
      showToast(`Failed to load chat: ${chatLoadError.message}`, "error");
    }
  }, [chatLoadError, showToast]);

  // Debounce function (simple implementation)
  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise(resolve => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
  };

  // Auto-save promptDraft mutation
  const updatePromptDraftMutation = useMutation(
    trpc.chat.updatePromptDraft.mutationOptions({
      onSuccess: (updatedChat) => {
        if (updatedChat) {
          // Update local chat state with the new updatedAt and potentially other metadata changes from backend
          setChat(prevChat => prevChat && prevChat.id === updatedChat.id ? updatedChat : prevChat);
          console.log("Prompt draft auto-saved for chat:", updatedChat.id);
        }
      },
      onError: (error) => {
        // Maybe a subtle indicator for save failure, but toast might be too noisy for auto-save
        console.error("Failed to auto-save prompt draft:", error.message);
        // showToast(`Failed to save draft: ${error.message}`, "error"); // Potentially too noisy
      },
    }),
  );

  // Debounced version of the mutate function
  const debouncedUpdatePromptDraft = React.useCallback(
    debounce(updatePromptDraftMutation.mutate, 500), // 500ms debounce
    [updatePromptDraftMutation.mutate]
  );

  // Effect for auto-saving promptDraft
  useEffect(() => {
    if (chat?.id) { // Only save if a chat is loaded
      // Do not save if messageInput is undefined (it shouldn't be, but as a safeguard)
      // Or if the content is the same as what's already in chat.metadata.promptDraft to avoid redundant saves
      // However, the check for same content adds complexity if initial load sets messageInput from promptDraft
      // For simplicity, always save; backend can optimize if needed. Or rely on updatedAt.
      if (messageInput !== (chat.metadata?.promptDraft ?? "")) { // Only save if different from persisted
         debouncedUpdatePromptDraft({ chatId: chat.id, promptDraft: messageInput });
      }
    }
  }, [messageInput, chat?.id, chat?.metadata?.promptDraft, debouncedUpdatePromptDraft]);

  // Cleanup empty drafts mutation
  const cleanupEmptyDraftsMutation = useMutation(
    trpc.chat.cleanupEmptyDrafts.mutationOptions({
      onSuccess: () => {
        console.log("Empty draft cleanup requested.");
        // No toast needed for background cleanup
      },
      onError: (error) => {
        console.error("Failed to request empty draft cleanup:", error.message);
        // showToast("Failed to clean up empty drafts.", "error"); // Potentially too noisy
      },
    }),
  );

  // Effect for cleaning up empty drafts when chat selection changes or component unmounts
  useEffect(() => {
    // This function will be called when selectedChatFile changes (i.e. navigating away from current chat)
    // or when the component unmounts.
    const cleanup = () => {
      // We don't know for sure if the chat we are navigating away from was an empty draft.
      // Calling the generic cleanup is a broad approach.
      // The backend's isEmptyDraft logic will determine what actually gets deleted.
      if (chat) { // Only attempt cleanup if there was a chat loaded
           console.log("ChatPanel: selectedChatFile changed or unmounted, potentially cleaning drafts for chat:", chat.id);
           cleanupEmptyDraftsMutation.mutate({}); // Call with empty input, backend handles correlationId
      }
    };

    // Return the cleanup function to be executed on unmount or before re-running due to dependency change
    return cleanup;
  }, [selectedChatFile, chat, cleanupEmptyDraftsMutation]); // Depends on selectedChatFile to run on switch; 'chat' to access previous chat info


  // Submit message mutation
  const submitMessageMutationOptions = trpc.chat.submitMessage.mutationOptions({
    onSuccess: (updatedChat) => {
      setChat(updatedChat); // Backend now handles DRAFT -> ACTIVE transition
      setMessageInput(""); // Clear input after successful send, this will also clear promptDraft via auto-save
      showToast("Message sent successfully", "success");

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
            onClick={invalidateChatQueries}
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
            ref={inputRef} // Assign ref
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
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
