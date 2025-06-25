// apps/my-app-trpc-2/src/components/new-chat-modal.tsx
import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import { XLg, ChatDots } from "react-bootstrap-icons";
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
        "error",
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
        <Dialog.Overlay className="animate-in fade-in-0 fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="animate-in fade-in-0 zoom-in-95 fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 duration-200">
          <div className="bg-panel border-border mx-4 rounded-lg border shadow-xl">
            {/* Header */}
            <div className="border-border flex items-center justify-between border-b p-6">
              <Dialog.Title className="text-foreground flex items-center text-xl font-semibold">
                <ChatDots className="mr-2 text-lg" />
                New Chat
              </Dialog.Title>
              <Dialog.Close className="text-muted hover:text-accent">
                <XLg className="text-xl" />
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="space-y-4 p-6">
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
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
                  className="bg-input-background border-input-border focus:border-accent placeholder-muted text-foreground w-full rounded-lg border px-3 py-2 focus:outline-none"
                  placeholder="Enter directory path..."
                  required
                />
              </div>

              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  Initial Prompt:
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, prompt: e.target.value }))
                  }
                  onKeyPress={handleKeyPress}
                  className="bg-input-background border-input-border focus:border-accent placeholder-muted text-foreground h-32 w-full resize-none rounded-lg border px-3 py-2 focus:outline-none"
                  placeholder="Write a simple prompt..."
                />
                <div className="text-muted mt-1 text-xs">
                  Tip: Press Ctrl+Enter to create
                </div>
              </div>

              {/* Settings Row */}
              <div className="flex flex-wrap items-center justify-between gap-4">
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
                      <label htmlFor="chat" className="text-foreground text-sm">
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
                        className="text-foreground text-sm"
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
                      className="text-foreground text-sm"
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
                    className="bg-input-background border-input-border text-foreground focus:border-accent rounded border px-3 py-1 text-sm focus:outline-none"
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
                    className="bg-hover text-muted hover:bg-selected rounded px-4 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={createChatMutation.isPending}
                    className="bg-accent hover:bg-accent/80 rounded px-6 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
