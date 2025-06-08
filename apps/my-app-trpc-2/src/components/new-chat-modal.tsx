// apps/my-app-trpc-2/src/components/new-chat-modal.tsx
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTRPC } from "../lib/trpc";
import { useAppStore } from "../store/app-store";

export const NewChatModal: React.FC = () => {
  const trpc = useTRPC();

  const {
    isNewChatModalOpen,
    closeNewChatModal,
    selectedTreeNode,
    setSelectedChatFile,
  } = useAppStore();

  const [formData, setFormData] = useState({
    targetDirectory: selectedTreeNode || "",
    mode: "chat" as "chat" | "agent",
    model: "default",
    prompt: "",
    createNewTask: false,
  });

  // Create mutation options using the new TanStack React Query pattern
  const createChatMutationOptions = trpc.chat.createChat.mutationOptions({
    onSuccess: (newChat) => {
      setSelectedChatFile(newChat.absoluteFilePath);
      closeNewChatModal();
      setFormData({
        targetDirectory: "",
        mode: "chat",
        model: "default",
        prompt: "",
        createNewTask: false,
      });
    },
    onError: (error) => {
      console.error("Failed to create chat:", error);
      alert("Failed to create chat. Please try again.");
    },
  });

  const createChatMutation = useMutation(createChatMutationOptions);

  if (!isNewChatModalOpen) return null;

  const handleSubmit = async () => {
    if (!formData.targetDirectory) {
      alert("Please select a target directory");
      return;
    }

    await createChatMutation.mutateAsync({
      targetDirectoryAbsolutePath: formData.targetDirectory,
      newTask: formData.createNewTask,
      mode: formData.mode,
      knowledge: [],
      prompt: formData.prompt || undefined,
      model: formData.model,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">💬 New Chat</h2>
          <button
            onClick={closeNewChatModal}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Directory:
            </label>
            <input
              type="text"
              value={formData.targetDirectory}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  targetDirectory: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter directory path..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Prompt:
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, prompt: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write a simple prompt..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="chat"
                  name="mode"
                  value="chat"
                  checked={formData.mode === "chat"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      mode: e.target.value as "chat",
                    }))
                  }
                />
                <label htmlFor="chat" className="text-sm">
                  Chat
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="agent"
                  name="mode"
                  value="agent"
                  checked={formData.mode === "agent"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      mode: e.target.value as "agent",
                    }))
                  }
                />
                <label htmlFor="agent" className="text-sm">
                  Agent
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="createNewTask"
                  checked={formData.createNewTask}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      createNewTask: e.target.checked,
                    }))
                  }
                />
                <label htmlFor="createNewTask" className="text-sm">
                  ☑️ Create New Task
                </label>
              </div>

              <select
                value={formData.model}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, model: e.target.value }))
                }
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="default">Claude</option>
              </select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={createChatMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createChatMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
