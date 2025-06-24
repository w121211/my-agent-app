// apps/my-app-trpc-2/src/components/chat-panel.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import {
  Send,
  Paperclip,
  ChevronDown,
  MessageSquare,
  Edit,
  Copy,
  MoreHorizontal,
  Home,
  ChevronRight,
  Download,
  Lightbulb,
  FileText,
} from "lucide-react";
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
    <Select.Trigger className="inline-flex items-center justify-center gap-1 rounded px-3 py-1 text-xs bg-panel border border-border hover:bg-hover focus:outline-none focus:border-accent min-w-[80px] text-muted">
      <Select.Value />
      <Select.Icon>
        <ChevronDown size={12} />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="overflow-hidden bg-panel rounded border border-border shadow-lg">
        <Select.Viewport className="p-1">
          <Select.Item
            value="chat"
            className="relative flex items-center px-6 py-2 text-sm rounded cursor-pointer hover:bg-hover focus:bg-hover outline-none text-foreground"
          >
            <Select.ItemText>Chat</Select.ItemText>
          </Select.Item>
          <Select.Item
            value="agent"
            className="relative flex items-center px-6 py-2 text-sm rounded cursor-pointer hover:bg-hover focus:bg-hover outline-none text-foreground"
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
    <Select.Trigger className="inline-flex items-center justify-center gap-1 rounded px-3 py-1 text-xs bg-panel border border-border hover:bg-hover focus:outline-none focus:border-accent min-w-[120px] text-muted">
      <Select.Value />
      <Select.Icon>
        <ChevronDown size={12} />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="overflow-hidden bg-panel rounded border border-border shadow-lg">
        <Select.Viewport className="p-1">
          <Select.Item
            value="claude"
            className="relative flex items-center px-6 py-2 text-sm rounded cursor-pointer hover:bg-hover focus:bg-hover outline-none text-foreground"
          >
            <Select.ItemText>Claude 3.7</Select.ItemText>
          </Select.Item>
          <Select.Item
            value="gemini"
            className="relative flex items-center px-6 py-2 text-sm rounded cursor-pointer hover:bg-hover focus:bg-hover outline-none text-foreground"
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
      className={`flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUserMessage ? "mr-2" : "ml-7"}`}
    >
      <button
        onClick={handleEdit}
        className="text-muted hover:text-accent"
        title="Edit"
      >
        <Edit size={14} />
      </button>
      <button
        onClick={handleCopy}
        className="text-muted hover:text-accent"
        title="Copy"
      >
        <Copy size={14} />
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="text-muted hover:text-accent" title="More">
            <MoreHorizontal size={14} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="min-w-[180px] bg-panel rounded-md border border-border shadow-lg z-50"
            sideOffset={5}
          >
            {moreMenuItems.map((item) => (
              <DropdownMenu.Item
                key={item.label}
                className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-hover outline-none text-foreground"
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
        className="flex items-center gap-2 border border-border rounded px-3 py-1 bg-panel hover:bg-hover text-foreground text-sm font-medium"
      >
        <FileText size={14} />
        {fileName}
        {version && <span className="ml-1 text-xs text-muted">{version}</span>}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="ml-2 text-muted hover:text-accent"
          title="Download"
        >
          <Download size={14} />
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
      <div className="flex flex-col items-end group">
        <div className="bg-accent/20 border border-accent/30 rounded-lg px-4 py-2 max-w-xl text-foreground ml-auto">
          {/* Render file references as clickable links */}
          {fileReferences.length > 0 && (
            <div className="mb-2">
              {fileReferences.map((ref, index) => (
                <button
                  key={index}
                  className="text-accent ml-1 hover:text-accent/80 text-sm"
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
    <div className="flex flex-col items-start group">
      <div className="flex items-center mb-0.5 gap-2">
        <span className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
          C
        </span>
        <span className="text-xs text-muted font-medium">Claude Sonnet 4</span>
      </div>
      <div className="pl-7 text-foreground leading-normal">
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
        enabled: !!chat,
        onData: (event) => {
          if (event.data.chatId === chat?.id) {
            console.log(
              "Chat event received:",
              event.data.updateType,
              event.data
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
      }
    )
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
    }
  }, [loadedChat]);

  // Handle chat loading errors
  useEffect(() => {
    if (chatLoadError) {
      showToast(`Failed to load chat: ${chatLoadError.message}`, "error");
    }
  }, [chatLoadError, showToast]);

  // Submit message mutation
  const submitMessageMutationOptions = trpc.chat.submitMessage.mutationOptions({
    onSuccess: (updatedChat) => {
      setChat(updatedChat);
      setMessageInput("");
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
        "error"
      );

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

  const handleWhatsNext = () => {
    showToast(
      "What's Next: Refactor your utils.ts for better modularity.",
      "info"
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
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted">
          <MessageSquare size={48} className="mx-auto mb-4" />
          <p>Select a chat file to start</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted">Loading chat...</div>
      </div>
    );
  }

  if (chatLoadError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-red-400">
          <MessageSquare size={48} className="mx-auto mb-4" />
          <p className="mb-2">Failed to load chat</p>
          <button
            onClick={() =>
              queryClient.refetchQueries({
                queryKey: openChatFileQueryOptions.queryKey,
              })
            }
            className="px-3 py-1 text-sm bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 border border-red-600/40"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0">
      {/* Breadcrumb Header */}
      <header className="h-12 bg-surface border-b border-border flex items-center px-4 gap-2">
        <Home size={14} className="text-muted" />
        <span className="text-muted text-xs">
          {selectedChatFile.split("/").slice(-3, -1).join("")}
        </span>
        <ChevronRight size={12} className="text-muted" />
        <span className="text-muted text-xs">
          {selectedChatFile.split("/").pop()}
        </span>
        <div className="ml-auto flex items-center space-x-2">
          <button
            onClick={invalidateChatQueries}
            className="text-xs px-2 py-1 bg-panel rounded hover:bg-hover text-muted"
          >
            🔄 Refresh
          </button>
          <div className="text-xs text-muted">
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
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5 bg-background">
        {chat?.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isUserMessage={message.role === "USER"}
          />
        ))}
      </div>

      {/* Input Area */}
      <footer className="border-t border-border px-6 py-4 bg-panel">
        <div className="relative">
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="w-full bg-input-background border border-input-border rounded-md px-3 py-3 resize-none focus:outline-none focus:border-accent placeholder-muted text-foreground text-[15px]"
            rows={3}
          />
        </div>

        {/* Controls below input */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <button className="text-muted hover:text-accent" title="Attach">
            <Paperclip size={16} />
          </button>

          <ChatModeSelect value={chatMode} onValueChange={setChatMode} />
          <ModelSelect value={model} onValueChange={setModel} />

          <button
            onClick={handleWhatsNext}
            className="text-muted hover:text-accent text-xs flex items-center"
          >
            <Lightbulb size={14} className="mr-1" />
            What&apos;s next
          </button>

          <button
            onClick={handleSummarize}
            className="text-muted hover:text-accent text-xs flex items-center"
          >
            <FileText size={14} className="mr-1" />
            Summarize
          </button>

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || submitMessageMutation.isPending}
            className="hover:bg-accent/80 text-muted px-3 py-1.5 rounded ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
};
