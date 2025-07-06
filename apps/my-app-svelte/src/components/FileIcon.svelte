<!-- apps/my-app-svelte/src/components/shared/FileIcon.svelte -->
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
    FileEarmarkCheck,
  } from "svelte-bootstrap-icons";

  interface FileIconProps {
    fileName: string;
    isDirectory?: boolean;
    isExpanded?: boolean;
    size?: string;
    className?: string;
  }

  let {
    fileName,
    isDirectory = false,
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
        return FileEarmarkCode;
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
      return "text-accent";
    }

    if (fileName.endsWith(".chat.json")) {
      return "text-accent";
    }

    // Color based on file type
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
        return "text-blue-300";
      case "json":
        return "text-green-400";
      case "md":
        return "text-blue-200";
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
        return "text-purple-400";
      case "pdf":
        return "text-red-400";
      default:
        return "text-muted";
    }
  }
</script>

{@const IconComponent = getIconComponent()}
<IconComponent class="{size} {getIconColor()} {className}" />
