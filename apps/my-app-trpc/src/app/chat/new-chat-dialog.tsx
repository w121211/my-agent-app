// apps/my-app-trpc/src/app/chat/new-chat-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle,
} from "@/components/dialog";
import { Label, Textarea } from "@/components/input";
import { trpc } from "@/lib/trpc-client";

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
  targetDirectory?: string | null;
}

export function NewChatDialog({
  open,
  onClose,
  targetDirectory,
}: NewChatDialogProps) {
  const [selectedDirectory, setSelectedDirectory] = useState("");
  const [prompt, setPrompt] = useState("");
  const [taskKnowledge, setTaskKnowledge] = useState("");
  const [taskInstruction, setTaskInstruction] = useState("");
  const [createNewTask, setCreateNewTask] = useState(false);
  const [mode, setMode] = useState<"chat" | "agent">("chat");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const utils = trpc.useUtils();

  // Fetch project folders for directory selection
  const { data: projectFolders = [] } =
    trpc.projectFolder.getAllProjectFolders.useQuery();

  const createChat = trpc.chat.createChat.useMutation({
    onSuccess: (chat) => {
      utils.chat.getAll.invalidate();
      utils.task.getAll.invalidate();

      // Navigate to the new chat
      if (chat.taskId) {
        router.push(`/workspace/tasks/${chat.taskId}/chats/${chat.id}`);
      } else {
        router.push(`/workspace/chats/${chat.id}`);
      }

      onClose();
      resetForm();
    },
    onError: (error) => {
      alert("Error creating chat: " + error.message);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const resetForm = () => {
    setPrompt("");
    setTaskKnowledge("");
    setTaskInstruction("");
    setCreateNewTask(false);
    setMode("chat");
  };

  useEffect(() => {
    if (targetDirectory) {
      setSelectedDirectory(targetDirectory);
    } else if (projectFolders.length > 0) {
      setSelectedDirectory(projectFolders[0]?.path || "");
    }
  }, [targetDirectory, projectFolders]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDirectory.trim()) return;

    setIsLoading(true);

    // Build the full prompt with task knowledge and instruction
    let fullPrompt = "";

    if (taskKnowledge.trim()) {
      fullPrompt += `<task_knowledge>\n${taskKnowledge.trim()}\n</task_knowledge>\n\n`;
    }

    if (taskInstruction.trim()) {
      fullPrompt += `<task_instruction>\n${taskInstruction.trim()}\n</task_instruction>\n\n`;
    }

    fullPrompt += prompt.trim();

    createChat.mutate({
      targetDirectoryAbsolutePath: selectedDirectory,
      newTask: createNewTask,
      mode,
      knowledge: taskKnowledge ? [taskKnowledge] : [],
      prompt: fullPrompt,
      model: "default",
      correlationId: uuidv4(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} size="2xl">
      <DialogTitle>💬 New Chat</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogBody>
          <div className="space-y-4">
            {/* Target Directory Selection */}
            {!targetDirectory && (
              <div>
                <Label className="text-sm/6 font-medium">
                  Target Directory
                </Label>
                <select
                  value={selectedDirectory}
                  onChange={(e) => setSelectedDirectory(e.target.value)}
                  className="w-full rounded-lg border-none bg-gray-300/5 px-3 py-2 text-sm/6 dark:text-white focus:outline-none"
                >
                  <option value="">Select a project folder...</option>
                  {projectFolders.map((folder: any) => (
                    <option key={folder.id} value={folder.path}>
                      {folder.name} ({folder.path})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetDirectory && (
              <div>
                <Label className="text-sm/6 font-medium">
                  Target Directory
                </Label>
                <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
                  {targetDirectory}
                </div>
              </div>
            )}

            {/* Task Knowledge */}
            <div>
              <Label className="text-sm/6 font-medium">
                Task Knowledge (Optional)
              </Label>
              <Textarea
                value={taskKnowledge}
                onChange={(e) => setTaskKnowledge(e.target.value)}
                placeholder="#file1.py #file2.md\nReference files or knowledge that the AI should be aware of..."
                rows={3}
                className="w-full"
              />
            </div>

            {/* Task Instruction */}
            <div>
              <Label className="text-sm/6 font-medium">
                Task Instruction (Optional)
              </Label>
              <Textarea
                value={taskInstruction}
                onChange={(e) => setTaskInstruction(e.target.value)}
                placeholder="Specific instructions or context for this task..."
                rows={3}
                className="w-full"
              />
            </div>

            {/* Prompt */}
            <div>
              <Label className="text-sm/6 font-medium">Initial Message</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Write your initial message or question..."
                rows={4}
                className="w-full"
                required
              />
            </div>

            {/* Options */}
            <div className="flex flex-wrap gap-4">
              {/* Mode Selection */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("chat")}
                  className={`rounded-md px-3 py-1 text-sm ${
                    mode === "chat"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setMode("agent")}
                  className={`rounded-md px-3 py-1 text-sm ${
                    mode === "agent"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Agent
                </button>
              </div>

              {/* Create New Task */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createNewTask}
                  onChange={(e) => setCreateNewTask(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">☑️ Create New Task</span>
              </label>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!selectedDirectory.trim() || !prompt.trim() || isLoading}
          >
            {isLoading ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
