// apps/my-app-trpc-2/src/components/preview-panel.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../lib/trpc";
import { useAppStore } from "../store/app-store";
import { Edit, Download, Share, File } from "lucide-react";

export const PreviewPanel: React.FC = () => {
  const trpc = useTRPC();
  const { selectedPreviewFile } = useAppStore();

  const { data: fileContent, isLoading } = useQuery(
    trpc.file.openFile.queryOptions(
      { filePath: selectedPreviewFile! },
      {
        enabled: !!selectedPreviewFile,
      }
    )
  );

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
    </div>
  );
};
