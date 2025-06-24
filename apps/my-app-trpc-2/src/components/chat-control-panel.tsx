// apps/my-app-trpc-2/src/components/chat-control-panel.tsx
import React, { useState } from "react";
import { useToast } from "./toast-provider";
import { Edit, Check, Download, FileText } from "lucide-react";

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
            className="text-accent hover:text-accent/80 underline mr-2"
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header */}
      <div className="h-12 border-b border-border flex items-center px-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Chat Control
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Project Context Section */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted">
              Project Context
            </h3>
            {!isEditingContext ? (
              <button
                onClick={handleEditContext}
                className="text-xs text-muted hover:text-accent"
                title="Edit"
              >
                <Edit size={14} />
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveContext}
                  className="text-xs text-muted hover:text-accent"
                  title="Save"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-xs text-muted hover:text-red-400"
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
              className="bg-input-background border border-input-border rounded p-3 text-sm text-muted min-h-[100px] cursor-text hover:border-accent/50 transition-colors"
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
              className="text-foreground text-sm w-full bg-input-background border border-input-border rounded-md px-3 py-2 resize-none focus:outline-none focus:border-accent placeholder-muted"
              placeholder="#<demo-project>/demo.md #/path/to/outside/file.md&#10;Text is also allowed"
              autoFocus
            />
          )}
        </div>

        {/* Artifacts Section */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted">
              Artifacts
            </h3>
            <button
              onClick={() =>
                showToast(
                  "Download all artifacts functionality coming soon",
                  "info"
                )
              }
              className="text-xs text-muted hover:text-accent"
              title="Download All"
            >
              <Download size={14} />
            </button>
          </div>

          <div className="space-y-2">
            {MOCK_ARTIFACTS.map((artifact) => (
              <div
                key={artifact.id}
                className="flex items-center justify-between p-2 bg-panel rounded cursor-pointer hover:bg-hover group"
                onClick={() => handlePreviewFile(artifact.fileName)}
              >
                <div className="flex items-center">
                  <FileText size={14} className="mr-2 text-foreground" />
                  <span className="text-sm text-foreground">
                    {artifact.fileName}
                  </span>
                  <span className="ml-1 text-xs text-muted">
                    {artifact.version}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadArtifact(artifact.fileName);
                  }}
                  className="text-xs text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Download"
                >
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>

          {MOCK_ARTIFACTS.length === 0 && (
            <div className="text-xs text-muted text-center py-4">
              No artifacts yet
            </div>
          )}
        </div>

        {/* Additional sections can be added here */}
        <div className="p-4">
          <div className="text-xs text-muted">
            Additional chat controls and settings can be added here as needed.
          </div>
        </div>
      </div>
    </div>
  );
};
