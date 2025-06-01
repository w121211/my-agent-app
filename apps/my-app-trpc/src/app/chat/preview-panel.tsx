// apps/my-app-trpc/src/app/chat/preview-panel.tsx
"use client";

import {
  PencilIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  DocumentIcon,
  CodeBracketIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/button";
import { trpc } from "@/lib/trpc-client";

interface PreviewPanelProps {
  selectedFilePath?: string;
}

export function PreviewPanel({ selectedFilePath }: PreviewPanelProps) {
  const [filePath, setFilePath] = useState<string | null>(
    selectedFilePath || null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const searchParams = useSearchParams();

  // Get file path from URL params if available
  useEffect(() => {
    const fileParam = searchParams.get("file");
    if (fileParam) {
      setFilePath(fileParam);
    }
  }, [searchParams]);

  // Fetch file content
  const { data: fileData, isLoading } = trpc.file.openFile.useQuery(
    { filePath: filePath! },
    { enabled: !!filePath }
  );

  // Get file type
  const { data: fileType } = trpc.file.getFileType.useQuery(
    { filePath: filePath! },
    { enabled: !!filePath }
  );

  useEffect(() => {
    if (fileData?.content) {
      setEditContent(fileData.content);
    }
  }, [fileData?.content]);

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return PhotoIcon;
    if (
      type.includes("text") ||
      type.includes("json") ||
      type.includes("javascript") ||
      type.includes("typescript")
    ) {
      return CodeBracketIcon;
    }
    return DocumentIcon;
  };

  const handleDownload = () => {
    if (!fileData) return;

    const blob = new Blob([fileData.content], {
      type: fileType || "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filePath?.split("/").pop() || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!filePath) return;

    try {
      await navigator.share({
        title: filePath.split("/").pop(),
        text: `Sharing file: ${filePath}`,
        url: window.location.href + `?file=${encodeURIComponent(filePath)}`,
      });
    } catch (err) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(
        window.location.href + `?file=${encodeURIComponent(filePath)}`
      );
      alert("Link copied to clipboard!");
    }
  };

  const renderFileContent = () => {
    if (!fileData) return null;

    // Image files
    if (fileType?.startsWith("image/")) {
      return (
        <div className="flex items-center justify-center p-4">
          <img
            src={`data:${fileType};base64,${btoa(fileData.content)}`}
            alt="Preview"
            className="max-w-full max-h-96 rounded-lg shadow-sm"
          />
        </div>
      );
    }

    // Text/code files
    if (isEditing) {
      return (
        <div className="flex-1 p-4">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full resize-none rounded-lg border border-gray-200 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Enter file content..."
          />
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto p-4">
        <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
          {fileData.content}
        </pre>
      </div>
    );
  };

  if (!filePath) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-4 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Preview
          </h3>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-gray-500">
            <DocumentIcon className="mx-auto size-12 mb-2" />
            <p className="text-sm">No file selected</p>
            <p className="text-xs">
              Select a file from the explorer to preview it here
            </p>
          </div>
        </div>
      </div>
    );
  }

  const FileIcon = getFileIcon(fileType || "");
  const fileName = filePath.split("/").pop() || "Unknown file";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4 dark:border-gray-800">
        <div className="space-y-3">
          {/* Breadcrumb */}
          <div className="text-xs text-gray-600 dark:text-gray-400">
            🏠 Home {">"} 📁 {filePath.split("/").slice(-3, -1).join(" > ")}
          </div>

          {/* File info */}
          <div className="flex items-center gap-2">
            <FileIcon className="size-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {fileName}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => setIsEditing(!isEditing)}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <PencilIcon className="size-3" />
              {isEditing ? "View" : "Edit"}
            </Button>

            <Button
              onClick={handleDownload}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <ArrowDownTrayIcon className="size-3" />
              Download
            </Button>

            <Button
              onClick={handleShare}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <ShareIcon className="size-3" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-sm text-gray-500">Loading file...</div>
        </div>
      ) : (
        renderFileContent()
      )}

      {/* Save button for editing mode */}
      {isEditing && (
        <div className="border-t p-4 dark:border-gray-800">
          <div className="flex gap-2">
            <Button
              onClick={() => {
                // In a real app, this would save the file
                alert("Save functionality would be implemented here");
                setIsEditing(false);
              }}
              size="sm"
              className="gap-2"
            >
              Save Changes
            </Button>
            <Button
              onClick={() => {
                setEditContent(fileData?.content || "");
                setIsEditing(false);
              }}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
