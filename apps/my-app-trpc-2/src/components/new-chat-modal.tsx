// apps/my-app-trpc-2/src/components/new-chat-modal.tsx
import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import { X, MessageSquare } from "lucide-react";
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

  // Create mutation options
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
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
          <div className="bg-panel rounded-lg shadow-xl mx-4 border border-border">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <Dialog.Title className="text-xl font-semibold text-foreground flex items-center">
                <MessageSquare size={20} className="mr-2" />
                New Chat
              </Dialog.Title>
              <Dialog.Close className="text-muted hover:text-accent">
                <X size={24} />
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
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
                  onKeyPress={handleKeyPress}
                  className="w-full bg-input-background border border-input-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent placeholder-muted text-foreground"
                  placeholder="Enter directory path..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Initial Prompt:
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, prompt: e.target.value }))
                  }
                  onKeyPress={handleKeyPress}
                  className="w-full bg-input-background border border-input-border rounded-lg px-3 py-2 h-32 resize-none focus:outline-none focus:border-accent placeholder-muted text-foreground"
                  placeholder="Write a simple prompt..."
                />
                <div className="text-xs text-muted mt-1">
                  Tip: Press Ctrl+Enter to create
                </div>
              </div>

              {/* Settings Row */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-6">
                  {/* Mode Selection */}
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
                        className="accent-accent"
                      />
                      <label htmlFor="chat" className="text-sm text-foreground">
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
                        className="accent-accent"
                      />
                      <label
                        htmlFor="agent"
                        className="text-sm text-foreground"
                      >
                        Agent
                      </label>
                    </div>
                  </div>

                  {/* Create New Task Checkbox */}
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
                      className="accent-accent"
                    />
                    <label
                      htmlFor="createNewTask"
                      className="text-sm text-foreground"
                    >
                      Create New Task
                    </label>
                  </div>

                  {/* Model Selection */}
                  <select
                    value={formData.model}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        model: e.target.value,
                      }))
                    }
                    className="bg-input-background border border-input-border rounded px-3 py-1 text-sm text-foreground focus:outline-none focus:border-accent"
                  >
                    <option value="default">Claude 3.7</option>
                    <option value="gemini">Gemini 2.5 Pro</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={closeNewChatModal}
                    disabled={createChatMutation.isPending}
                    className="px-4 py-2 bg-hover text-muted rounded hover:bg-selected disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={createChatMutation.isPending}
                    className="px-6 py-2 bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {createChatMutation.isPending ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
