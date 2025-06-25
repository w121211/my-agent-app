// apps/my-app-trpc-2/src/components/preview-panel.tsx
import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";
import { useAppStore } from "../store/app-store";
import { useToast } from "./toast-provider";
import {
  Pencil,
  Download,
  Share,
  FileEarmark,
  XLg,
  ArrowClockwise,
} from "react-bootstrap-icons";

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
      },
    ),
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
      <div className="flex h-full flex-col">
        <div className="border-border flex h-12 items-center justify-between border-b px-4">
          <div className="flex items-center">
            <span className="text-foreground font-medium">Loading...</span>
            <span className="text-muted ml-2 text-xs">Preview</span>
          </div>
          <button
            onClick={handleClose}
            className="text-muted hover:text-accent"
            title="Close"
          >
            <XLg className="text-base" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-muted">Loading file...</div>
        </div>
      </div>
    );
  }

  if (fileLoadError) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-border flex h-12 items-center justify-between border-b px-4">
          <div className="flex items-center">
            <span className="font-medium text-red-400">Error</span>
            <span className="text-muted ml-2 text-xs">Preview</span>
          </div>
          <button
            onClick={handleClose}
            className="text-muted hover:text-accent"
            title="Close"
          >
            <XLg className="text-base" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-red-400">
            <FileEarmark className="mx-auto mb-4 text-5xl" />
            <p className="mb-2">Failed to load file</p>
            <p className="text-muted mb-3 text-sm">
              {selectedPreviewFile.split("/").pop()}
            </p>
            <button
              onClick={handleRefresh}
              className="rounded border border-red-600/40 bg-red-600/20 px-3 py-1 text-sm text-red-400 hover:bg-red-600/30"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex h-12 items-center justify-between border-b px-4">
        <div className="flex items-center">
          <span className="text-foreground font-medium">
            {selectedPreviewFile.split("/").pop()}
          </span>
          <span className="text-muted ml-2 text-xs">Preview</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleEdit}
            className="text-muted hover:text-accent"
            title="Edit"
          >
            <Pencil className="text-sm" />
          </button>
          <button
            onClick={handleDownload}
            className="text-muted hover:text-accent"
            title="Download"
          >
            <Download className="text-sm" />
          </button>
          <button
            onClick={handleShare}
            className="text-muted hover:text-accent"
            title="Share"
          >
            <Share className="text-sm" />
          </button>
          <button
            onClick={handleRefresh}
            className="text-muted hover:text-accent"
            title="Refresh"
          >
            <ArrowClockwise className="text-sm" />
          </button>
          <button
            onClick={handleClose}
            className="text-muted hover:text-accent"
            title="Close"
          >
            <XLg className="text-base" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {fileContent?.isBase64 ? (
          <div className="text-muted text-center">
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
              <pre className="text-foreground whitespace-pre-wrap break-words font-mono text-sm">
                {fileContent?.content}
              </pre>
            ) : (
              <pre className="text-foreground whitespace-pre-wrap break-words font-mono text-sm">
                {fileContent?.content}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* File info footer */}
      {fileContent && (
        <div className="border-border text-muted bg-panel border-t p-2 text-xs">
          Type: {fileContent.fileType} | Size:{" "}
          {fileContent.isBase64
            ? `${fileContent.content.length} bytes (base64)`
            : `${fileContent.content.length} characters`}
        </div>
      )}
    </div>
  );
};
