import { useState, useEffect } from "react";
import { Logger } from "tslog";
import { usePreviewPanelStore } from "../../features/preview-panel/preview-panel-store";
import {
  useWorkspaceTreeStore,
  isFolderNode,
} from "../../features/workspace-tree/workspace-tree-store";

const logger = new Logger({ name: "file-preview-panel" });

const FilePreviewPanel = () => {
  const { selectedNode } = useWorkspaceTreeStore();
  const { currentFile, isLoading, error } = usePreviewPanelStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  // Update edit content when current file changes
  useEffect(() => {
    if (currentFile) {
      setEditContent(currentFile.content);
      setIsEditing(false);
    }
  }, [currentFile]);

  // Render placeholder when no file is selected or it's a folder
  if (!selectedNode || isFolderNode(selectedNode)) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a file to view its content
      </div>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading file content...
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error: {error}
      </div>
    );
  }

  // If we have a selected node but no current file yet, show a loading message
  if (!currentFile) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading content for: {selectedNode.path}...
      </div>
    );
  }

  // Get file extension and determine syntax highlighting language
  const fileName = selectedNode.name;
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";

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
      scss: "scss",
      less: "less",
    };

    return languageMap[ext] || "plaintext";
  };

  const language =
    currentFile.fileType === "plaintext"
      ? getLanguage(fileExtension)
      : currentFile.fileType;

  // Get path display
  const getPathDisplay = () => {
    const parts = selectedNode.path.split("/").filter(Boolean);

    return (
      <>
        <span className="text-gray-500">🏠 Home &gt; </span>
        {parts.map((part, index) => (
          <span key={index} className="text-gray-500">
            {index < parts.length - 1 ? `${part} > ` : part}
          </span>
        ))}
      </>
    );
  };

  // Handle edit toggle
  const toggleEdit = () => {
    if (isEditing) {
      logger.debug(`Saving changes to: ${selectedNode.path}`);
      // Save functionality would go here
      // For now, just log that it's not implemented yet
      logger.info("Save functionality not implemented yet");
    }
    setIsEditing(!isEditing);
  };

  // Handle download
  const handleDownload = () => {
    const blob = new Blob([currentFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Handle share
  const handleShare = () => {
    logger.debug(`Share request for: ${selectedNode.path}`);
    // Placeholder for future implementation
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="text-sm">{getPathDisplay()}</div>
        <h2 className="text-lg font-medium mt-1">{fileName}</h2>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-2 border-b flex">
        <button
          onClick={toggleEdit}
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
