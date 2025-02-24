import React, { useRef, useEffect } from "react";
import { Send, Paperclip } from "lucide-react";
import { useChatStore } from "@/lib/chat-store";

const ChatMessage = ({
  role,
  content,
}: {
  role: "user" | "ai";
  content: string;
}) => (
  <div className={`px-4 py-2 ${role === "user" ? "bg-white" : "bg-gray-50"}`}>
    <div className="font-medium text-sm text-gray-700">
      [{role === "user" ? "User" : "AI"}]
    </div>
    <div className="mt-1 text-gray-800 whitespace-pre-wrap">{content}</div>
  </div>
);

const ChatPanel = () => {
  const { messages, currentPath, inputMessage, addMessage, setInputMessage } =
    useChatStore();

  // 新增一個 ref 用於訪問訊息容器
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 當訊息更新時自動捲動到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    addMessage({
      role: "user",
      content: inputMessage,
      timestamp: new Date().toISOString(),
    });

    // Simulate AI response
    setTimeout(() => {
      addMessage({
        role: "ai",
        content: "This is a simulated AI response.",
        timestamp: new Date().toISOString(),
      });
    }, 1000);

    setInputMessage("");
  };

  if (!currentPath) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select a chat file to start the conversation
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Path display */}
      <div className="px-4 py-2 border-b bg-gray-50">
        <div className="text-sm text-gray-600">{currentPath}</div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            role={message.role}
            content={message.content}
          />
        ))}
        {/* 新增一個空的 div 作為捲動的目標 */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="p-2 text-blue-500 hover:text-blue-700"
            disabled={!inputMessage.trim()}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
