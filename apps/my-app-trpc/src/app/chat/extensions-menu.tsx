// apps/my-app-trpc/src/app/chat/extensions-menu.tsx
"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle,
} from "@/components/dialog";
import { Textarea } from "@/components/input";
import { trpc } from "@/lib/trpc-client";

interface ExtensionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  onSelectPrompt: (prompt: string) => void;
}

export function ExtensionsMenu({
  isOpen,
  onClose,
  chatId,
  onSelectPrompt,
}: ExtensionsMenuProps) {
  const [showWhatsNext, setShowWhatsNext] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: chat } = trpc.chat.getById.useQuery({ chatId });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const suggestedActions = [
    {
      id: "implement-features",
      icon: "🎯",
      title: "Start implementing features based on discussion",
      description: "Begin coding based on the current conversation",
    },
    {
      id: "write-tests",
      icon: "🧪",
      title: "Write tests for existing code",
      description: "Create comprehensive test coverage",
    },
    {
      id: "prepare-deployment",
      icon: "🚀",
      title: "Prepare deployment configurations",
      description: "Set up deployment and CI/CD pipelines",
    },
    {
      id: "optimize-performance",
      icon: "⚡",
      title: "Optimize performance",
      description: "Improve code efficiency and speed",
    },
    {
      id: "add-documentation",
      icon: "📚",
      title: "Add documentation",
      description: "Create comprehensive project documentation",
    },
  ];

  const handleSummarize = () => {
    const prompt = `<task_knowledge>
${chat?.fileName || "current chat"}
</task_knowledge>

<task_instruction>
Please create a comprehensive summary of our conversation, highlighting key decisions, technical approaches, and next steps.
</task_instruction>

✨ Please summarize our discussion and save the key points for future reference.`;

    onSelectPrompt(prompt);
    onClose();
  };

  const handleWhatsNext = () => {
    setShowWhatsNext(true);
    // Auto-select first action initially
    if (suggestedActions.length > 0) {
      handleSelectAction(suggestedActions[0].id);
    }
  };

  const handleSelectAction = (actionId: string) => {
    setSelectedAction(actionId);
    const action = suggestedActions.find((a) => a.id === actionId);

    if (action) {
      const prompt = `<task_knowledge>
${chat?.fileName || "current chat"}
${chat?.projectPath ? `#${chat.projectPath}` : ""}
</task_knowledge>

<task_instruction>
${action.description}
</task_instruction>

${
  action.title.toLowerCase().includes("implement")
    ? "Please implement this feature according to our discussion, with specific requirements:\n1. Follow the architecture design confirmed in our conversation\n2. Implement core functionality logic\n3. Add appropriate error handling"
    : action.title.toLowerCase().includes("test")
      ? "Please write comprehensive tests for the existing code:\n1. Unit tests for individual functions\n2. Integration tests for components\n3. Edge case coverage"
      : action.title.toLowerCase().includes("deploy")
        ? "Please set up deployment configurations:\n1. Create deployment scripts\n2. Configure CI/CD pipeline\n3. Set up environment variables"
        : action.description
}`;

      setGeneratedPrompt(prompt);
    }
  };

  const handleExecuteWhatsNext = () => {
    const finalPrompt = customPrompt.trim() || generatedPrompt;
    onSelectPrompt(finalPrompt);
    setShowWhatsNext(false);
    onClose();

    // Reset state
    setSelectedAction(null);
    setCustomPrompt("");
    setGeneratedPrompt("");
  };

  const handleRegenerateSuggestions = () => {
    // In a real app, this would call the AI to generate new suggestions
    // For now, we'll just shuffle the existing ones
    alert(
      "Feature coming soon: AI will generate fresh suggestions based on your current context"
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Extensions Dropdown Menu */}
      <div
        ref={menuRef}
        className="absolute bottom-full right-0 mb-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
      >
        <div className="py-1">
          <button
            onClick={handleSummarize}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <SparklesIcon className="size-4" />
            Summarize
          </button>

          <button
            onClick={handleWhatsNext}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            🔮 What's Next?
          </button>
        </div>
      </div>

      {/* What's Next Dialog */}
      <Dialog
        open={showWhatsNext}
        onClose={() => setShowWhatsNext(false)}
        size="2xl"
      >
        <DialogTitle>🔮 What's Next?</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI-suggested next actions (please select one):
            </p>

            {/* Suggested Actions */}
            <div className="space-y-2">
              {suggestedActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleSelectAction(action.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedAction === action.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{action.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className="text-xs text-gray-500">
                        {action.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleRegenerateSuggestions}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                🔄 Regenerate suggestions
              </Button>
              <Button
                onClick={() => {
                  setCustomPrompt(generatedPrompt);
                  setSelectedAction("custom");
                }}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                ✍️ Custom input
              </Button>
            </div>

            <hr className="dark:border-gray-700" />

            {/* Generated Prompt */}
            <div>
              <label className="block text-sm font-medium mb-2">
                📝 Generated Prompt (based on selected action):
              </label>
              <Textarea
                value={
                  selectedAction === "custom" ? customPrompt : generatedPrompt
                }
                onChange={(e) => {
                  if (selectedAction === "custom") {
                    setCustomPrompt(e.target.value);
                  }
                }}
                rows={12}
                className="w-full font-mono text-xs"
                readOnly={selectedAction !== "custom"}
              />
            </div>

            {/* Mode Selection */}
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md bg-blue-100 px-3 py-1 text-sm text-blue-800"
                >
                  Chat
                </button>
                <button
                  type="button"
                  className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-600"
                >
                  Agent
                </button>
              </div>

              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">☑️ Create New Task</span>
              </label>

              <span className="text-sm text-gray-500">Claude</span>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button variant="ghost" onClick={() => setShowWhatsNext(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExecuteWhatsNext}
            disabled={!generatedPrompt && !customPrompt.trim()}
          >
            Execute
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
