// apps/my-app-trpc-2/src/components/right-panel.tsx
import React, { useEffect } from "react";
import { useAppStore } from "../store/app-store";
import { ChatControlPanel } from "./chat-control-panel";
import { PreviewPanel } from "./preview-panel";

export const RightPanel: React.FC = () => {
  const { selectedPreviewFile, setSelectedPreviewFile } = useAppStore();

  // Handle escape key to close preview overlay
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedPreviewFile) {
        setSelectedPreviewFile(null);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [selectedPreviewFile, setSelectedPreviewFile]);

  return (
    <div className="w-96 bg-surface border-l border-border flex flex-col relative">
      {/* Base Layer: Chat Control Panel */}
      <ChatControlPanel />

      {/* Overlay Layer: Preview Panel */}
      {selectedPreviewFile && (
        <div className="absolute inset-0 bg-surface z-20">
          <PreviewPanel />
        </div>
      )}
    </div>
  );
};
