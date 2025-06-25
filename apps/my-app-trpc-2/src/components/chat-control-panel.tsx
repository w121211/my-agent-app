// apps/my-app-trpc-2/src/components/chat-control-panel.tsx
import React, { useState } from "react";
import { useToast } from "./toast-provider";
import { Pencil, CheckLg, Download, FileEarmark } from "react-bootstrap-icons";

// Mock project context data
const MOCK_PROJECT_CONTEXT = `#<demo-project>/demo.md #/path/to/outside/file.md
Text is also allowed here for additional context.`;

// Mock artifacts data
const MOCK_ARTIFACTS = [
  {
    id: "1",
    fileName: "wireframe.html",
    version: "v3",
    type: "html",
  },
  {
    id: "2",
    fileName: "component-design.tsx",
    version: "v2",
    type: "typescript",
  },
];

export const ChatControlPanel: React.FC = () => {
  const { showToast } = useToast();
  const [projectContext, setProjectContext] = useState(MOCK_PROJECT_CONTEXT);
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [contextInput, setContextInput] = useState(projectContext);

  const handleEditContext = () => {
    setContextInput(projectContext);
    setIsEditingContext(true);
  };

  const handleSaveContext = () => {
    setProjectContext(contextInput);
    setIsEditingContext(false);
    showToast("Project context updated", "success");
  };

  const handleCancelEdit = () => {
    setContextInput(projectContext);
    setIsEditingContext(false);
  };

  const handleDownloadArtifact = (fileName: string) => {
    showToast(`Download ${fileName} functionality coming soon`, "info");
  };

  const handlePreviewFile = (filePath: string) => {
    // This would trigger the preview overlay
    showToast(`Preview ${filePath} functionality coming soon`, "info");
  };

  const renderContextContent = (text: string) => {
    const parts = text.split(/(#[^\s]+)/g);

    return parts.map((part, index) => {
      if (part.startsWith("#")) {
        const filePath = part.substring(1);
        return (
          <button
            key={index}
            onClick={() => handlePreviewFile(filePath)}
            className="text-accent hover:text-accent/80 mr-2 underline"
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Panel Header */}
      <div className="border-border flex h-12 items-center border-b px-4">
        <span className="text-muted text-xs font-semibold uppercase tracking-wide">
          Chat Control
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Project Context Section */}
        <div className="border-border border-b p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-muted text-xs font-semibold tracking-wide">
              Project Context
            </h3>
            {!isEditingContext ? (
              <button
                onClick={handleEditContext}
                className="text-muted hover:text-accent text-xs"
                title="Edit"
              >
                <Pencil className="text-sm" />
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveContext}
                  className="text-muted hover:text-accent text-xs"
                  title="Save"
                >
                  <CheckLg className="text-sm" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-muted text-xs hover:text-red-400"
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* View Mode */}
          {!isEditingContext && (
            <div
              onClick={handleEditContext}
              className="bg-input-background border-input-border text-muted hover:border-accent/50 min-h-[100px] cursor-text rounded border p-3 text-sm transition-colors"
            >
              {renderContextContent(projectContext)}
            </div>
          )}

          {/* Edit Mode */}
          {isEditingContext && (
            <textarea
              value={contextInput}
              onChange={(e) => setContextInput(e.target.value)}
              rows={4}
              className="text-foreground bg-input-background border-input-border focus:border-accent placeholder-muted w-full resize-none rounded-md border px-3 py-2 text-sm focus:outline-none"
              placeholder="#<demo-project>/demo.md #/path/to/outside/file.md&#10;Text is also allowed"
              autoFocus
            />
          )}
        </div>

        {/* Artifacts Section */}
        <div className="border-border border-b p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-muted text-xs font-semibold tracking-wide">
              Artifacts
            </h3>
            <button
              onClick={() =>
                showToast(
                  "Download all artifacts functionality coming soon",
                  "info",
                )
              }
              className="text-muted hover:text-accent text-xs"
              title="Download All"
            >
              <Download className="text-sm" />
            </button>
          </div>

          <div className="space-y-2">
            {MOCK_ARTIFACTS.map((artifact) => (
              <div
                key={artifact.id}
                className="bg-panel hover:bg-hover group flex cursor-pointer items-center justify-between rounded p-2"
                onClick={() => handlePreviewFile(artifact.fileName)}
              >
                <div className="flex items-center">
                  <FileEarmark className="text-foreground mr-2 text-sm" />
                  <span className="text-foreground text-sm">
                    {artifact.fileName}
                  </span>
                  <span className="text-muted ml-1 text-xs">
                    {artifact.version}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadArtifact(artifact.fileName);
                  }}
                  className="text-muted hover:text-accent text-xs opacity-0 transition-opacity group-hover:opacity-100"
                  title="Download"
                >
                  <Download className="text-sm" />
                </button>
              </div>
            ))}
          </div>

          {MOCK_ARTIFACTS.length === 0 && (
            <div className="text-muted py-4 text-center text-xs">
              No artifacts yet
            </div>
          )}
        </div>

        {/* Additional sections can be added here */}
        <div className="p-4">
          <div className="text-muted text-xs">
            Additional chat controls and settings can be added here as needed.
          </div>
        </div>
      </div>
    </div>
  );
};
