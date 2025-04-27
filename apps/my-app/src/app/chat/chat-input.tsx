import React, { useState, useRef, KeyboardEvent } from "react";
import { useChatService } from "../../lib/di/di-provider";
import { ILogObj, Logger } from "tslog";

// Setup logger
const logger = new Logger<ILogObj>({ name: "chat-input" });

interface ChatInputProps {
  chatId: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ chatId }) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [model, setModel] = useState("Claude 3.7");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatService = useChatService();

  // Adjust text area height based on content
  const adjustTextAreaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  // Handle message change
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextAreaHeight();
  };

  // Handle file attachment
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle enter key press
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle message submission
  const handleSubmit = async () => {
    if (!message.trim() && attachments.length === 0) return;

    setIsSubmitting(true);

    try {
      // Convert attachments to format expected by the event
      const attachmentsData = await Promise.all(
        attachments.map(async (file) => {
          return {
            fileName: file.name,
            content: await readFileAsBase64(file),
          };
        })
      );

      // Emit ClientSubmitUserChatMessage event via service
      if (!chatService) {
        throw new Error("Chat service is not available");
      }
      await chatService.submitMessage(chatId, message, attachmentsData);

      // Clear input after successful submission
      setMessage("");
      setAttachments([]);
      adjustTextAreaHeight();
    } catch (error) {
      logger.error("Error submitting message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Utility to read file as base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Toggle between chat and agent mode
  const toggleMode = () => {
    setIsAgentMode(!isAgentMode);
  };

  return (
    <div className="rounded-lg border border-gray-300 overflow-hidden">
      {/* Text area for message input */}
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleMessageChange}
        onKeyDown={handleKeyDown}
        placeholder="Write a message..."
        className="w-full p-3 focus:outline-none resize-none min-h-[80px]"
        disabled={isSubmitting}
      />

      {/* Attachment preview area */}
      {attachments.length > 0 && (
        <div className="p-2 bg-gray-50 border-t">
          <div className="text-xs text-gray-500 mb-1">Attachments:</div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="px-2 py-1 bg-gray-100 rounded text-xs flex items-center"
              >
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="ml-1 text-gray-500 hover:text-red-500"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls area */}
      <div className="flex justify-between items-center p-2 bg-gray-50 border-t">
        <div className="flex items-center space-x-2">
          {/* Chat/Agent mode toggle */}
          <button
            className={`px-2 py-1 text-xs rounded ${
              isAgentMode
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={toggleMode}
          >
            {isAgentMode ? "Agent" : "Chat"}
          </button>

          {/* Model selector */}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="text-xs bg-gray-100 border px-2 py-1 rounded"
          >
            <option>Claude 3.7</option>
            <option>Claude 3 Opus</option>
            <option>Claude 3.5 Haiku</option>
          </select>

          {/* File attachment button */}
          <button
            onClick={handleAttachClick}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
            title="Attach files"
          >
            <span role="img" aria-label="Attach">
              📎
            </span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={
            isSubmitting || (!message.trim() && attachments.length === 0)
          }
          className={`px-3 py-1 rounded ${
            isSubmitting || (!message.trim() && attachments.length === 0)
              ? "bg-gray-200 text-gray-500"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          {isSubmitting ? (
            <span className="inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
          ) : (
            "Send"
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
