// src/components/chat/chat-interface.tsx
"use client";

import { PaperAirplaneIcon, BoltIcon } from "@heroicons/react/24/outline";
import { cx } from "class-variance-authority";
import { format, formatDistanceToNow, isToday } from "date-fns";
import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/button";
import { Textarea } from "@/components/input";
import { trpc } from "@/lib/trpc-client";
import { ExtensionsMenu } from "./extensions-menu";

interface ChatInterfaceProps {
  chatId: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: Array<{
    fileName: string;
    content: string;
  }>;
}

export function ChatInterface({ chatId }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [showExtensions, setShowExtensions] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch chat data
  const { data: chat, isLoading } = trpc.chat.getById.useQuery({ chatId });

  const utils = trpc.useUtils();
  const submitMessage = trpc.chat.submitMessage.useMutation({
    onSuccess: () => {
      utils.chat.getById.invalidate({ chatId });
      setMessage("");
      scrollToBottom();
    },
    onError: (error) => {
      alert("Error sending message: " + error.message);
    },
    onSettled: () => {
      setIsTyping(false);
    },
  });

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isTyping) return;

    setIsTyping(true);
    submitMessage.mutate({
      chatId,
      message: message.trim(),
      correlationId: uuidv4(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const renderTaskContext = () => {
    if (!chat?.taskKnowledge && !chat?.taskInstruction) return null;

    return (
      <div className="border-b bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            ▼ Task Knowledge & Instruction
          </h3>

          {chat.taskKnowledge && (
            <div className="rounded-lg bg-white p-3 text-sm dark:bg-gray-800">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                &lt;task_knowledge&gt;
              </div>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {chat.taskKnowledge}
              </div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                &lt;/task_knowledge&gt;
              </div>
            </div>
          )}

          {chat.taskInstruction && (
            <div className="rounded-lg bg-white p-3 text-sm dark:bg-gray-800">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                &lt;task_instruction&gt;
              </div>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {chat.taskInstruction}
              </div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                &lt;/task_instruction&gt;
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-gray-500">Loading chat...</div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-gray-500">Chat not found</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb */}
      <div className="border-b bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          🏠 Home {chat.projectPath && `> 📁 ${chat.projectName}`}
          {chat.taskId && ` > 📋 ${chat.taskName}`}
          {` > ${chat.fileName}`}
        </div>
      </div>

      {/* Task Context */}
      {renderTaskContext()}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {chat.messages?.map((msg: Message) => (
          <div
            key={msg.id}
            className={cx(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cx(
                "max-w-[80%] rounded-lg p-3",
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
              )}
            >
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>

              {/* Message actions for AI responses */}
              {msg.role === "assistant" && (
                <div className="mt-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                  >
                    copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                  >
                    retry
                  </Button>
                </div>
              )}

              <div className="mt-1 text-xs opacity-70">
                {isToday(new Date(msg.timestamp))
                  ? formatDistanceToNow(new Date(msg.timestamp)) + " ago"
                  : format(new Date(msg.timestamp), "MMM d, yyyy h:mm a")}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 dark:bg-gray-800">
              <div className="flex items-center gap-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Message Input */}
          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a message..."
              rows={Math.min(message.split("\n").length, 4)}
              className="pr-12 resize-none"
              disabled={isTyping}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 top-2 size-8"
              disabled={!message.trim() || isTyping}
            >
              <PaperAirplaneIcon className="size-4" />
            </Button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Chat</span>
              <span className="text-xs text-gray-300">|</span>
              <span className="text-xs text-gray-500">Claude</span>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" className="gap-2">
                📎 Upload Files
              </Button>

              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowExtensions(!showExtensions)}
                >
                  <BoltIcon className="size-4" />
                  Extensions
                </Button>

                <ExtensionsMenu
                  isOpen={showExtensions}
                  onClose={() => setShowExtensions(false)}
                  chatId={chatId}
                  onSelectPrompt={(prompt) => {
                    setMessage(prompt);
                    setShowExtensions(false);
                  }}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
