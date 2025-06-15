// apps/my-app-trpc-2/src/components/new-chat-modal.tsx
import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTRPC } from "../lib/trpc";
import { useAppStore } from "../store/app-store";
import { useToast } from "./toast-provider";

export const NewChatModal: React.FC = () => {
  const trpc = useTRPC();
  const { showToast } = useToast();

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
      showToast("Chat created successfully", "success");
    },
    onError: (error) => {
      console.error("Failed to create chat:", error);
      showToast(
        `Failed to create chat: ${error.message || "Unknown error"}`,
        "error"
      );
    },
  });

  const createChatMutation = useMutation(createChatMutationOptions);

  const handleSubmit = async () => {
    if (!formData.targetDirectory) {
      showToast("Please select a target directory", "error");
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
    <Dialog.Root
      open={isNewChatModalOpen}
      onOpenChange={(open) => {
        if (!open) closeNewChatModal();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in-0 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="bg-white rounded-lg shadow-xl mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <Dialog.Title className="text-xl font-semibold">
                💬 New Chat
              </Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </Dialog.Close>
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
                      Create New Task
                    </label>
                  </div>

                  <select
                    value={formData.model}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        model: e.target.value,
                      }))
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
