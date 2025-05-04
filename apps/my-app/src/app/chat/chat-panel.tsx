import React, { useState, useEffect, useRef } from "react";
import { Logger } from "tslog";
import { useChatPanelStore } from "../../features/chat-panel/chat-panel-store";
import { useChatPanelService } from "../../lib/di/di-provider";
import { ChatMessage, ChatMode, Role } from "@repo/events-core/event-types";

const logger = new Logger({ name: "chat-panel" });

interface ChatMessageItemProps {
  message: ChatMessage;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isUser = message.role === "USER";
  const isSummarize = message.content.startsWith("[Summarize ✨]");

  // Special handling for system/summary messages
  if (isSummarize) {
    return (
      <div className="my-3 p-3 bg-yellow-50 border-yellow-200 border rounded">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`my-3 ${isUser ? "" : "bg-gray-50 p-3 rounded"}`}>
      <div className="font-medium mb-1">
        {isUser ? "[User]" : "[AI]"}
        {isUser && (
          <button className="ml-2 text-sm text-gray-500 hover:underline">
            [edit]
          </button>
        )}
      </div>
      <div className="whitespace-pre-wrap">{message.content}</div>

      {!isUser && (
        <div className="mt-2 text-sm text-gray-500 flex gap-2">
          <button className="hover:underline">[copy]</button>
          <button className="hover:underline">[retry]</button>
          <button className="hover:underline">[...]</button>
        </div>
      )}
    </div>
  );
};

interface NextStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    prompt: string,
    options: { mode: ChatMode; createNewTask: boolean; model: string }
  ) => void;
}

const NextStepModal: React.FC<NextStepModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [prompt, setPrompt] = useState<string>("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const [createNewTask, setCreateNewTask] = useState<boolean>(true);
  const [model, setModel] = useState<string>("Claude 3.7");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-medium mb-4">Next Step</h2>
        <p className="text-gray-600 mb-4">(AI Suggestions)</p>
        <div className="flex gap-2 mb-4 flex-wrap">
          <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded">
            [Translate extracted text to Traditional Chinese]
          </button>
          <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded">
            [Suggestion 2...]
          </button>
          <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded">
            [Suggestion 3...]
          </button>
        </div>

        <div className="border rounded p-4 mb-4">
          <div className="text-xs font-mono">
            &lt;task_knowledge&gt; #chat_summary.md &lt;/task_knowledge&gt;
            &lt;task_instruction /&gt;
          </div>

          <textarea
            className="w-full border rounded p-2 mt-4"
            rows={5}
            placeholder="Prompt..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              className="border rounded p-1"
              value={mode}
              onChange={(e) => setMode(e.target.value as ChatMode)}
            >
              <option value="chat">Chat</option>
              <option value="agent">Agent</option>
            </select>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={createNewTask}
                onChange={(e) => setCreateNewTask(e.target.checked)}
                className="mr-1"
              />
              Create New Task
            </label>

            <select
              className="border rounded p-1"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="Claude 3.7">Claude 3.7</option>
              <option value="Claude 3.5">Claude 3.5</option>
              <option value="Claude 3">Claude 3</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(prompt, { mode, createNewTask, model })}
              className="px-3 py-1 bg-blue-500 text-white hover:bg-blue-600 rounded"
              disabled={!prompt.trim()}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatPanel: React.FC = () => {
  const {
    currentChat,
    isLoading,
    isResponding,
    messageInput,
    error,
    setMessageInput,
  } = useChatPanelStore();
  const chatPanelService = useChatPanelService();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isNextStepModalOpen, setIsNextStepModalOpen] =
    useState<boolean>(false);
  const [chatMode, setChatMode] = useState<ChatMode>("chat");
  const [selectedModel, setSelectedModel] = useState<string>("Claude 3.7");

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages]);

  // Set initial chat mode from chat metadata
  useEffect(() => {
    if (currentChat?.metadata?.mode) {
      setChatMode(currentChat.metadata.mode);
    }

    if (currentChat?.metadata?.model) {
      setSelectedModel(currentChat.metadata.model);
    }
  }, [currentChat]);

  // Handle send message
  const handleSendMessage = (): void => {
    if (!messageInput.trim() || !chatPanelService) return;

    chatPanelService.submitUserMessage(messageInput);
  };

  // Handle summarize
  const handleSummarize = (): void => {
    if (!chatPanelService) return;

    chatPanelService.summarizeChat();
  };

  // Handle attachment button
  const handleAttachment = (): void => {
    logger.debug("Attachment feature not implemented in MVP");
  };

  // Handle next step modal submit
  const handleNextStepSubmit = (
    prompt: string,
    options: { mode: ChatMode; createNewTask: boolean; model: string }
  ): void => {
    if (!chatPanelService) return;

    chatPanelService.createNewChat(prompt, {
      newTask: options.createNewTask,
      mode: options.mode,
      knowledge: ["chat_summary.md"],
      model: options.model,
    });

    setIsNextStepModalOpen(false);
  };

  // Render placeholder when no chat is selected
  if (!currentChat && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a chat or create a new one to start a conversation
      </div>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading chat...
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error: {error}
      </div>
    );
  }

  // If for some reason we don't have a chat after all the checks
  if (!currentChat) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with path and task info */}
      <div className="p-4 border-b">
        <div className="text-sm text-gray-500">
          🏠 Home &gt; 👥 Workspace
          {currentChat.metadata?.title && (
            <> &gt; 📋 {currentChat.metadata.title}</>
          )}
          {currentChat.filePath && (
            <> &gt; {currentChat.filePath.split("/").pop()}</>
          )}
        </div>
      </div>

      {/* Task knowledge section */}
      <div className="px-4 py-2 border-b">
        <details>
          <summary className="font-medium cursor-pointer">
            ▼ Task Knowledge & Instruction
          </summary>
          <div className="border rounded p-2 mt-1">
            <div className="text-xs font-mono">
              <div>
                &lt;task_knowledge&gt;
                {currentChat.metadata?.knowledge?.map((k, i) => (
                  <div key={i}>#{k}</div>
                ))}
                &lt;/task_knowledge&gt;
              </div>
              <div>
                &lt;task_instruction&gt;
                {/* Instruction content would go here */}
                &lt;/task_instruction&gt;
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Messages area */}
      <div className="flex-grow overflow-y-auto p-4">
        {currentChat.messages.map((message, index) => (
          <ChatMessageItem
            key={message.id || `msg-${index}`}
            message={message}
          />
        ))}

        {isResponding && (
          <div className="p-3 bg-gray-100 rounded mb-3">
            <div className="animate-pulse">AI is responding...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Actions and input area */}
      <div className="border-t p-4">
        <div className="flex gap-2 mb-2">
          <button
            onClick={handleSummarize}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          >
            Summarize ✨
          </button>
          <button
            onClick={() => setIsNextStepModalOpen(true)}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          >
            Next Step ▶️✨
          </button>
        </div>

        <div className="flex flex-col">
          <textarea
            className="w-full border rounded p-2 resize-none mb-2"
            placeholder="Write a message..."
            rows={2}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select
                className="border rounded p-1 text-sm"
                value={chatMode}
                onChange={(e) => setChatMode(e.target.value as ChatMode)}
              >
                <option value="chat">Chat</option>
                <option value="agent">Agent</option>
              </select>

              <select
                className="border rounded p-1 text-sm"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="Claude 3.7">Claude 3.7</option>
                <option value="Claude 3.5">Claude 3.5</option>
                <option value="Claude 3">Claude 3</option>
              </select>

              <button
                onClick={handleAttachment}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              >
                📎 Attach
              </button>
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || isResponding}
              className={`px-3 py-1 rounded text-sm ${
                !messageInput.trim() || isResponding
                  ? "bg-blue-300 text-white cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              Send ➤
            </button>
          </div>
        </div>
      </div>

      {/* Next Step Modal */}
      <NextStepModal
        isOpen={isNextStepModalOpen}
        onClose={() => setIsNextStepModalOpen(false)}
        onSubmit={handleNextStepSubmit}
      />
    </div>
  );
};

export default ChatPanel;
