// apps/my-app-trpc-2/src/components/preview-panel.tsx
import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";
import { useAppStore } from "../store/app-store";
import { useToast } from "./toast-provider";
import { Edit, Download, Share, File, X, RefreshCw } from "lucide-react";

export const PreviewPanel: React.FC = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { selectedPreviewFile, setSelectedPreviewFile } = useAppStore();

  // File API returns FileContent directly
  const {
    data: fileContent,
    isLoading,
    error: fileLoadError,
  } = useQuery(
    trpc.file.openFile.queryOptions(
      { filePath: selectedPreviewFile! },
      {
        enabled: !!selectedPreviewFile,
        staleTime: 1000 * 30, // 30 seconds
      }
    )
  );

  // Handle file loading errors
  useEffect(() => {
    if (fileLoadError) {
      showToast(`Failed to load file: ${fileLoadError.message}`, "error");
    }
  }, [fileLoadError, showToast]);

  const handleRefresh = () => {
    if (selectedPreviewFile) {
      const queryKey = trpc.file.openFile.queryKey({
        filePath: selectedPreviewFile,
      });
      queryClient.refetchQueries({ queryKey });
    }
  };

  const handleClose = () => {
    setSelectedPreviewFile(null);
  };

  const handleDownload = () => {
    showToast("Download functionality coming soon", "info");
  };

  const handleShare = () => {
    showToast("Share functionality coming soon", "info");
  };

  const handleEdit = () => {
    showToast("Edit functionality coming soon", "info");
  };

  if (!selectedPreviewFile) {
    return null; // This shouldn't happen since overlay only shows when file is selected
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-12 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center">
            <span className="font-medium text-foreground">Loading...</span>
            <span className="ml-2 text-xs text-muted">Preview</span>
          </div>
          <button
            onClick={handleClose}
            className="text-muted hover:text-accent"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted">Loading file...</div>
        </div>
      </div>
    );
  }

  if (fileLoadError) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-12 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center">
            <span className="font-medium text-red-400">Error</span>
            <span className="ml-2 text-xs text-muted">Preview</span>
          </div>
          <button
            onClick={handleClose}
            className="text-muted hover:text-accent"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-400">
            <File size={48} className="mx-auto mb-4" />
            <p className="mb-2">Failed to load file</p>
            <p className="text-sm text-muted mb-3">
              {selectedPreviewFile.split("/").pop()}
            </p>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 text-sm bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 border border-red-600/40"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center">
          <span className="font-medium text-foreground">
            {selectedPreviewFile.split("/").pop()}
          </span>
          <span className="ml-2 text-xs text-muted">Preview</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleEdit}
            className="text-muted hover:text-accent"
            title="Edit"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={handleDownload}
            className="text-muted hover:text-accent"
            title="Download"
          >
            <Download size={14} />
          </button>
          <button
            onClick={handleShare}
            className="text-muted hover:text-accent"
            title="Share"
          >
            <Share size={14} />
          </button>
          <button
            onClick={handleRefresh}
            className="text-muted hover:text-accent"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleClose}
            className="text-muted hover:text-accent"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {fileContent?.isBase64 ? (
          <div className="text-center text-muted">
            <div className="mb-2">Binary file preview not supported</div>
            <div className="text-sm">
              File type: {fileContent.fileType}
              <br />
              Size: {fileContent.content.length} bytes (base64)
            </div>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            {fileContent?.fileType === "markdown" ? (
              // For markdown files, we could add proper markdown rendering here
              <pre className="text-sm font-mono whitespace-pre-wrap break-words text-foreground">
                {fileContent?.content}
              </pre>
            ) : (
              <pre className="text-sm font-mono whitespace-pre-wrap break-words text-foreground">
                {fileContent?.content}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* File info footer */}
      {fileContent && (
        <div className="border-t border-border p-2 text-xs text-muted bg-panel">
          Type: {fileContent.fileType} | Size:{" "}
          {fileContent.isBase64
            ? `${fileContent.content.length} bytes (base64)`
            : `${fileContent.content.length} characters`}
        </div>
      )}
    </div>
  );
};
