// apps/my-app-svelte/src/services/file-service.ts
import { Logger } from "tslog";
import { trpcClient } from "./TrpcClient";
import { setLoading, showToast } from "$stores";

interface FileContent {
  content: string;
  fileType: string;
  absoluteFilePath: string;
  isBase64?: boolean;
}

class FileService {
  private logger = new Logger({ name: "FileService" });

  async openFile(filePath: string): Promise<FileContent> {
    setLoading("openFile", true);

    try {
      this.logger.info("Opening file:", filePath);
      const fileContent = await trpcClient.file.openFile.query({
        filePath,
      });

      this.logger.info("File opened successfully:", filePath);
      return fileContent;
    } catch (error) {
      this.logger.error("Failed to open file:", error);
      showToast(`Failed to open file: ${error.message}`, "error");
      throw error;
    } finally {
      setLoading("openFile", false);
    }
  }

  async getFileType(filePath: string): Promise<string> {
    try {
      this.logger.debug("Getting file type for:", filePath);
      const fileType = await trpcClient.file.getFileType.query({
        filePath,
      });

      this.logger.debug("File type determined:", fileType);
      return fileType;
    } catch (error) {
      this.logger.error("Failed to get file type:", error);
      showToast(`Failed to get file type: ${error.message}`, "error");
      throw error;
    }
  }

  getFileIcon(fileName: string, isDirectory: boolean, isExpanded = false) {
    if (isDirectory) {
      return isExpanded ? "folder-open" : "folder";
    }

    if (fileName.endsWith(".chat.json")) {
      return "chat-dots";
    }

    // Determine icon based on file extension
    const extension = fileName.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "ts":
      case "tsx":
        return "file-code";
      case "js":
      case "jsx":
        return "file-code";
      case "json":
        return "file-earmark-code";
      case "md":
        return "file-earmark-text";
      case "html":
        return "file-earmark-code";
      case "css":
        return "file-earmark-code";
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
        return "file-earmark-image";
      case "pdf":
        return "file-earmark-pdf";
      case "zip":
      case "tar":
      case "gz":
        return "file-earmark-zip";
      default:
        return "file-earmark";
    }
  }

  isImageFile(fileName: string): boolean {
    const imageExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".webp",
      ".bmp",
    ];
    return imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));
  }

  isBinaryFile(fileType: string): boolean {
    const binaryTypes = ["image", "pdf", "archive"];
    return binaryTypes.includes(fileType);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  extractFileReferences(
    content: string,
  ): Array<{ path: string; type: "file" | "image" }> {
    const references: Array<{ path: string; type: "file" | "image" }> = [];
    const regex =
      /#([^\s]+\.(png|jpg|jpeg|md|html|ts|js|tsx|jsx|json|css|svg|gif|pdf))/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        const filePath = match[1];
        const type = this.isImageFile(filePath) ? "image" : "file";
        references.push({ path: filePath, type });
      }
    }

    return references;
  }
}

export const fileService = new FileService();
