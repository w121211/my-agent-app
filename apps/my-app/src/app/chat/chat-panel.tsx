import React, { useRef, useEffect } from "react";
import { Chat } from "@repo/events-core/event-types";
import ChatMessage from "./chat-message";
import ChatInput from "./chat-input";
import { Logger } from "tslog";
import { useEventBus } from "../../lib/di/di-provider";

const logger = new Logger({ name: "chat-panel" });

interface ChatPanelProps {
  chat: Chat | null;
  isLoading: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ chat, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventBus = useEventBus();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  const handleNewChatClick = () => {
    logger.debug("New chat button clicked in chat panel");

    if (!eventBus) {
      logger.error("Event bus not initialized");
      return;
    }

    eventBus
      .emit({
        kind: "UINewChatButtonClicked",
        timestamp: new Date(),
      })
      .catch((error) => {
        logger.error("Failed to emit new chat event:", error);
      });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">No chat selected</p>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleNewChatClick}
        >
          Start New Chat
        </button>
      </div>
    );
  }

  // Get breadcrumb path for display
  const getPathDisplay = () => {
    const parts = chat.filePath?.split("/").filter(Boolean) || [];
    if (parts.length === 0) return "Home";

    return (
      <>
        <span className="text-gray-500">🏠 Home &gt; </span>
        {parts.map((part, index) => (
          <span key={index} className="text-gray-500">
            {index < parts.length - 1 ? `${part} > ` : part}
          </span>
        ))}
      </>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat header */}
      <div className="p-4 border-b">
        <div className="text-sm">{getPathDisplay()}</div>
        <div className="flex justify-between items-center mt-2">
          <h2 className="text-lg font-medium">
            {chat.metadata?.title || "Chat"}
          </h2>
          <button
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            onClick={handleNewChatClick}
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Task knowledge section - collapsible */}
      {chat.metadata?.knowledge && chat.metadata.knowledge.length > 0 && (
        <div className="border-b p-4">
          <details>
            <summary className="font-medium cursor-pointer">
              Task Knowledge & Instruction
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
              <div className="mb-2">
                <code>&lt;task_knowledge&gt;</code>
                <div className="pl-4">
                  {chat.metadata.knowledge.map((item, index) => (
                    <div key={index}>{item}</div>
                  ))}
                </div>
                <code>&lt;/task_knowledge&gt;</code>
              </div>
              {chat.metadata.tags && chat.metadata.tags.length > 0 && (
                <div>
                  <code>&lt;task_instruction&gt;</code>
                  <div className="pl-4">{chat.metadata.tags.join(", ")}</div>
                  <code>&lt;/task_instruction&gt;</code>
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* Messages container */}
      <div className="flex-grow overflow-y-auto p-4">
        {chat.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <div className="border-t p-4">
        <div className="flex space-x-2 mb-2">
          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200">
            Summarize ✨
          </button>
          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200">
            Next Step ▶️✨
          </button>
        </div>
        <ChatInput chatId={chat.id} />
      </div>
    </div>
  );
};

export default ChatPanel;
