// apps/my-app-trpc-2/src/components/preview-panel.tsx
import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";
import { useAppStore } from "../store/app-store";
import { useToast } from "./toast-provider";
import { Edit, Download, Share, File } from "lucide-react";

export const PreviewPanel: React.FC = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { selectedPreviewFile } = useAppStore();

  // UPDATED: File API returns FileContent directly
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

  if (!selectedPreviewFile) {
    return (
      <div className="w-96 border-l border-gray-200 bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <File size={48} className="mx-auto mb-4" />
          <p>Select a file to preview</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-96 border-l border-gray-200 bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading file...</div>
      </div>
    );
  }

  if (fileLoadError) {
    return (
      <div className="w-96 border-l border-gray-200 bg-white flex items-center justify-center">
        <div className="text-center text-red-500">
          <File size={48} className="mx-auto mb-4" />
          <p className="mb-2">Failed to load file</p>
          <p className="text-sm text-gray-500 mb-3">
            {selectedPreviewFile.split("/").pop()}
          </p>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="text-sm text-gray-600 mb-1">
          🏠 Home {">"} 📁{" "}
          {selectedPreviewFile.split("/").slice(-3, -1).join(" > ")}
        </div>
        <div className="text-sm text-gray-600 mb-3">
          {">"} 📄 {selectedPreviewFile.split("/").pop()}
        </div>

        <div className="flex space-x-2">
          <button className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center space-x-1">
            <Edit size={12} />
            <span>Edit</span>
          </button>
          <button className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center space-x-1">
            <Download size={12} />
            <span>Download</span>
          </button>
          <button className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center space-x-1">
            <Share size={12} />
            <span>Share</span>
          </button>
          <button
            onClick={handleRefresh}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="Refresh file"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {fileContent?.isBase64 ? (
          <div className="text-center text-gray-500">
            <div className="mb-2">Binary file preview not supported</div>
            <div className="text-sm">
              File type: {fileContent.fileType}
              <br />
              Size: {fileContent.content.length} bytes (base64)
            </div>
          </div>
        ) : (
          <pre className="text-sm font-mono whitespace-pre-wrap break-words">
            {fileContent?.content}
          </pre>
        )}
      </div>

      {/* File info footer */}
      {fileContent && (
        <div className="border-t border-gray-200 p-2 text-xs text-gray-500 bg-gray-50">
          Type: {fileContent.fileType} | Size:{" "}
          {fileContent.isBase64
            ? `${fileContent.content.length} bytes (base64)`
            : `${fileContent.content.length} characters`}
        </div>
      )}
    </div>
  );
};
