<!-- apps/my-app-svelte/src/components/FileIcon.svelte -->
<script lang="ts">
  import {
    Folder,
    Folder2Open,
    FileEarmark,
    FileEarmarkCode,
    FileEarmarkText,
    FileEarmarkImage,
    FileEarmarkPdf,
    FileEarmarkZip,
    ChatDots,
  } from "svelte-bootstrap-icons";

  interface FileIconProps {
    fileName: string;
    isDirectory: boolean;
    isExpanded?: boolean;
    size?: string;
    className?: string;
  }

  let {
    fileName,
    isDirectory,
    isExpanded = false,
    size = "text-sm",
    className = "",
  }: FileIconProps = $props();

  function getIconComponent() {
    if (isDirectory) {
      return isExpanded ? Folder2Open : Folder;
    }

    if (fileName.endsWith(".chat.json")) {
      return ChatDots;
    }

    // Determine icon based on file extension
    const extension = fileName.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "ts":
      case "tsx":
      case "js":
      case "jsx":
      case "html":
      case "css":
      case "json":
        return FileEarmarkCode;
      case "md":
      case "txt":
        return FileEarmarkText;
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
      case "webp":
      case "bmp":
        return FileEarmarkImage;
      case "pdf":
        return FileEarmarkPdf;
      case "zip":
      case "tar":
      case "gz":
        return FileEarmarkZip;
      default:
        return FileEarmark;
    }
  }

  function getIconColor() {
    if (isDirectory) {
      return "text-blue-400";
    }

    if (fileName.endsWith(".chat.json")) {
      return "text-green-400";
    }

    const extension = fileName.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "ts":
      case "tsx":
        return "text-blue-400";
      case "js":
      case "jsx":
        return "text-yellow-400";
      case "html":
        return "text-orange-400";
      case "css":
        return "text-blue-400";
      case "json":
        return "text-yellow-400";
      case "md":
        return "text-white";
      case "txt":
        return "text-muted";
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
      case "webp":
      case "bmp":
        return "text-purple-400";
      case "pdf":
        return "text-red-400";
      case "zip":
      case "tar":
      case "gz":
        return "text-yellow-400";
      default:
        return "text-muted";
    }
  }

  const IconComponent = getIconComponent();
  const iconColor = getIconColor();
</script>

<IconComponent class="{size} {iconColor} {className}" />
