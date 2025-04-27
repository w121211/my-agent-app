import React, { useState, useRef } from "react";
import { useChatService } from "../../lib/di/di-provider";
import { ILogObj, Logger } from "tslog";

// Setup logger
const logger = new Logger<ILogObj>({ name: "new-chat-modal" });

interface NewChatModalProps {
  onClose: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [mode, setMode] = useState<"chat" | "agent">("chat");
  const [model, setModel] = useState("Claude 3.7");
  const [knowledge, setKnowledge] = useState<string[]>([]);
  const [knowledgeInput, setKnowledgeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const chatService = useChatService();

  // Handle click outside modal to close it
  const handleOutsideClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Handle prompt change
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  // Handle knowledge input change
  const handleKnowledgeInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setKnowledgeInput(e.target.value);
  };

  // Add knowledge item
  const addKnowledge = () => {
    if (knowledgeInput.trim()) {
      if (!knowledgeInput.startsWith("#")) {
        setKnowledge([...knowledge, `#${knowledgeInput.trim()}`]);
      } else {
        setKnowledge([...knowledge, knowledgeInput.trim()]);
      }
      setKnowledgeInput("");
    }
  };

  // Handle key press for knowledge input
  const handleKnowledgeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKnowledge();
    }
  };

  // Remove knowledge item
  const removeKnowledge = (index: number) => {
    setKnowledge(knowledge.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setIsSubmitting(true);

    try {
      // Call service to create new chat
      if (chatService) {
        await chatService.createNewChat({
          newTask: isCreatingTask,
          mode,
          knowledge,
          prompt: prompt.trim(),
          model,
        });

        onClose();
      } else {
        logger.error("Chat service is null");
      }
    } catch (error) {
      logger.error("Error creating new chat:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOutsideClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-medium">New Chat</h2>
        </div>

        {/* Modal body */}
        <div className="px-6 py-4">
          {/* Task creation toggle */}
          <div className="mb-4">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isCreatingTask}
                  onChange={() => setIsCreatingTask(!isCreatingTask)}
                />
                <div
                  className={`block w-10 h-6 rounded-full ${
                    isCreatingTask ? "bg-blue-400" : "bg-gray-300"
                  }`}
                ></div>
                <div
                  className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    isCreatingTask ? "transform translate-x-4" : ""
                  }`}
                ></div>
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                Create New Task
              </span>
            </label>
          </div>

          {/* Mode selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mode
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600"
                  name="mode"
                  value="chat"
                  checked={mode === "chat"}
                  onChange={() => setMode("chat")}
                />
                <span className="ml-2 text-sm text-gray-700">Chat</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600"
                  name="mode"
                  value="agent"
                  checked={mode === "agent"}
                  onChange={() => setMode("agent")}
                />
                <span className="ml-2 text-sm text-gray-700">Agent</span>
              </label>
            </div>
          </div>

          {/* Model selection */}
          <div className="mb-4">
            <label
              htmlFor="model"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Claude 3.7">Claude 3.7</option>
              <option value="Claude 3 Opus">Claude 3 Opus</option>
              <option value="Claude 3.5 Haiku">Claude 3.5 Haiku</option>
            </select>
          </div>

          {/* Knowledge files */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Knowledge Files (Use # prefix)
            </label>
            <div className="flex">
              <input
                type="text"
                value={knowledgeInput}
                onChange={handleKnowledgeInputChange}
                onKeyDown={handleKnowledgeKeyDown}
                placeholder="#filename.ext"
                className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addKnowledge}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-r-md border border-l-0 border-gray-300 hover:bg-gray-200"
              >
                Add
              </button>
            </div>

            {/* Knowledge items list */}
            {knowledge.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {knowledge.map((item, index) => (
                  <div
                    key={index}
                    className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-md flex items-center"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => removeKnowledge(index)}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prompt textarea */}
          <div className="mb-4">
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Initial Prompt
            </label>
            <div className="border rounded-md p-2 bg-gray-50">
              {/* Task knowledge XML display */}
              {knowledge.length > 0 && (
                <div className="mb-2 text-sm text-gray-600 font-mono">
                  <div>&lt;task_knowledge&gt;</div>
                  <div className="pl-4">
                    {knowledge.map((item, index) => (
                      <div key={index}>{item}</div>
                    ))}
                  </div>
                  <div>&lt;/task_knowledge&gt;</div>
                </div>
              )}

              {/* Prompt textarea */}
              <textarea
                id="prompt"
                value={prompt}
                onChange={handlePromptChange}
                rows={6}
                placeholder="Enter your initial prompt..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="border-t px-6 py-4 flex justify-between">
          <div className="flex items-center space-x-2">
            <div
              className={`px-2 py-1 text-xs rounded ${
                mode === "agent"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {mode === "agent" ? "Agent" : "Chat"}
            </div>
            {isCreatingTask && (
              <div className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                New Task
              </div>
            )}
            <div className="text-sm text-gray-500">Model: {model}</div>
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !prompt.trim()}
              className={`px-4 py-2 font-medium rounded-md ${
                isSubmitting || !prompt.trim()
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
