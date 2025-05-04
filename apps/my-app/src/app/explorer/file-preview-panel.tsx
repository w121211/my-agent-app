import { useState, useEffect } from "react";
import { Logger } from "tslog";
import { usePreviewPanelStore } from "../../features/preview-panel/preview-panel-store";
import {
  useWorkspaceTreeStore,
  isFolderNode,
} from "../../features/workspace-tree/workspace-tree-store";

const logger = new Logger({ name: "file-preview-panel" });

interface FilePreviewPanelProps {
  onClose?: () => void;
}

const FilePreviewPanel = ({ onClose }: FilePreviewPanelProps) => {
  const { selectedNode } = useWorkspaceTreeStore();
  const { currentFile, isLoading, error } = usePreviewPanelStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  // Update edit content when current file changes
  useEffect(() => {
    if (currentFile?.content) {
      setEditContent(currentFile.content);
      setIsEditing(false);
    }
  }, [currentFile]);

  if (!selectedNode) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a file to preview
      </div>
    );
  }

  // Don't show preview for folders
  if (isFolderNode(selectedNode)) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Selected item is a folder
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading file content...
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error: {error}
      </div>
    );
  }

  // If we have a selected node but no current file yet
  if (!currentFile) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading content for: {selectedNode.name}...
      </div>
    );
  }

  // Get file extension for syntax highlighting
  const fileExtension = selectedNode.name.split(".").pop()?.toLowerCase() || "";

  const getLanguage = (ext: string): string => {
    const languageMap: Record<string, string> = {
      js: "javascript",
      ts: "typescript",
      tsx: "typescript",
      jsx: "javascript",
      py: "python",
      md: "markdown",
      json: "json",
      html: "html",
      css: "css",
    };
    return languageMap[ext] || "plaintext";
  };

  const language = getLanguage(fileExtension);

  // Create breadcrumb path components
  const getBreadcrumbPath = () => {
    const parts = selectedNode.path.split("/").filter(Boolean);

    return (
      <div className="text-sm mb-1">
        <span className="text-gray-500">🏠 Home &gt; </span>
        {parts.map((part, index) => (
          <span key={index} className="text-gray-500">
            {index === parts.length - 2 && part.match(/^t\d+/) ? "👥 " : ""}
            {part}
            {index < parts.length - 1 ? " > " : ""}
          </span>
        ))}
      </div>
    );
  };

  // Handle edit toggle
  const handleEditToggle = () => {
    if (isEditing) {
      logger.info(`Saving changes to ${selectedNode.path} (not implemented)`);
      // Here would be the actual save implementation
    }
    setIsEditing(!isEditing);
  };

  // Handle download
  const handleDownload = () => {
    const blob = new Blob([currentFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedNode.name;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    logger.info(`Downloaded file: ${selectedNode.path}`);
  };

  // Handle share
  const handleShare = () => {
    logger.info(`Share request for: ${selectedNode.path} (not implemented)`);
    // Placeholder for future share functionality
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        {getBreadcrumbPath()}
        <h2 className="text-lg font-semibold">{selectedNode.name}</h2>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-2 border-b flex">
        <button
          onClick={handleEditToggle}
          className="mr-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          {isEditing ? "Save" : "✏️ Edit"}
        </button>
        <button
          onClick={handleDownload}
          className="mr-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          ⬇️ Download
        </button>
        <button
          onClick={handleShare}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          📤 Share
        </button>
      </div>

      {/* Content area */}
      <div className="flex-grow overflow-auto p-4">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full p-2 font-mono text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <div className="bg-gray-50 p-4 border rounded h-full overflow-auto">
            <pre
              className={`language-${language} whitespace-pre-wrap text-sm font-mono`}
            >
              {currentFile.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreviewPanel;
