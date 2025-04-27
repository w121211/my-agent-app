import React from "react";
import { ChatMessage as ChatMessageType } from "@repo/events-core/event-types";
import { formatDistanceToNow } from "date-fns";

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { role, content, timestamp, metadata } = message;

  // Format timestamp to relative time
  const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });

  // Determine message style based on role
  const isUser = role === "USER";
  const isAssistant = role === "ASSISTANT";
  const isFunction = role === "FUNCTION_EXECUTOR";

  // Function to format message content with markdown-like syntax
  const formatContent = (content: string) => {
    // Basic markdown-like formatting for code blocks
    const formattedContent = content.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-gray-100 p-2 rounded my-2 overflow-x-auto"><code>$1</code></pre>'
    );

    return (
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />
    );
  };

  // Render file references if present
  const renderFileReferences = () => {
    if (!metadata?.fileReferences || metadata.fileReferences.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 text-xs text-gray-500">
        <span className="font-medium">Referenced files: </span>
        {metadata.fileReferences.map((ref, index) => (
          <span key={index} className="mr-2">
            {ref.path.split("/").pop()}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={`mb-4 ${isUser ? "pl-12" : "pr-12"}`}>
      {/* Message header */}
      <div className="flex items-center mb-1">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 
            ${isUser ? "bg-blue-100 text-blue-600" : isAssistant ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-600"}`}
        >
          {isUser ? "U" : isAssistant ? "AI" : "F"}
        </div>
        <div className="font-medium">
          {isUser ? "You" : isAssistant ? "Assistant" : "Function"}
        </div>
        <div className="text-xs text-gray-500 ml-2">{timeAgo}</div>

        {/* Edit button for user messages */}
        {isUser && (
          <button className="ml-2 text-xs text-blue-500 hover:underline">
            edit
          </button>
        )}
      </div>

      {/* Message content */}
      <div
        className={`p-3 rounded-lg ${
          isUser
            ? "bg-blue-50 border border-blue-100"
            : isAssistant
              ? "bg-white border border-gray-200"
              : "bg-gray-50 border border-gray-200"
        }`}
      >
        {formatContent(content)}
        {renderFileReferences()}
      </div>

      {/* Message actions - only for assistant messages */}
      {isAssistant && (
        <div className="flex mt-1 text-xs">
          <button className="text-gray-500 hover:text-gray-700 mr-3">
            copy
          </button>
          <button className="text-gray-500 hover:text-gray-700 mr-3">
            retry
          </button>
          <button className="text-gray-500 hover:text-gray-700">...</button>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
