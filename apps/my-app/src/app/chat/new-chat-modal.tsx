import React, { useState } from "react";
import { Logger } from "tslog";
import { useChatPanelService } from "../../lib/di/di-provider";
import { ChatMode } from "@repo/events-core/event-types";

const logger = new Logger({ name: "new-chat-modal" });

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const chatPanelService = useChatPanelService();
  const [prompt, setPrompt] = useState("Hello world");
  const [createNewTask, setCreateNewTask] = useState(false);
  const [mode, setMode] = useState<ChatMode>("chat");
  const [model, setModel] = useState("Claude 3.7");
  const [knowledge, setKnowledge] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!prompt.trim() || !chatPanelService) {
      logger.warn(
        "Cannot create new chat: empty prompt or service unavailable"
      );
      return;
    }

    // Parse knowledge references from the input
    const knowledgeArray = knowledge
      .split(/\s+/)
      .filter((k) => k.trim())
      .map((k) => (k.startsWith("#") ? k.substring(1) : k));

    logger.info(
      `Creating new chat with mode: ${mode}, new task: ${createNewTask}`
    );

    chatPanelService.createNewChat(prompt, {
      newTask: createNewTask,
      mode,
      knowledge: knowledgeArray,
      model,
    });

    // Reset form and close
    setPrompt("Hello world");
    setKnowledge("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-medium mb-4">✏️ New Chat</h2>

        <div className="border rounded p-4 mb-4">
          <div className="text-xs font-mono mb-2">
            &lt;task_knowledge&gt;
            <textarea
              className="w-full border rounded p-2 mt-1 mb-2 font-mono text-xs"
              placeholder="#p1.jpg #p2.jpg #*.jpg"
              rows={2}
              value={knowledge}
              onChange={(e) => setKnowledge(e.target.value)}
            />
            &lt;/task_knowledge&gt; &lt;task_instruction&gt; ...
            &lt;/task_instruction&gt;
          </div>

          <textarea
            className="w-full border rounded p-2 mt-4"
            rows={6}
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
              onClick={handleSubmit}
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

export default NewChatModal;
