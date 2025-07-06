<!-- apps/my-app-svelte/src/components/RightPanel.svelte -->
<script lang="ts">
  import { Logger } from "tslog";
  import { showToast, isLoadingOpenFile } from "../stores/ui-store";
  import { selectedPreviewFile } from "../stores/tree-store";
  import { fileService } from "../services/file-service";
  import {
    Pencil,
    CheckLg,
    Download,
    FileEarmark,
    XLg,
    ArrowClockwise,
    Share,
    Gear,
  } from "svelte-bootstrap-icons";

  const logger = new Logger({ name: "RightPanel" });

  // Context management state
  let projectContext = $state(`#<demo-project>/demo.md #/path/to/outside/file.md
Text is also allowed here for additional context.`);
  let isEditingContext = $state(false);
  let contextInput = $state(projectContext);

  // Preview state
  let fileContent = $state<any>(null);
  let fileLoadError = $state<string | null>(null);

  // Mock artifacts
  const mockArtifacts = [
    {
      id: "1",
      fileName: "wireframe.html",
      version: "v3",
      type: "html",
    },
    {
      id: "2",
      fileName: "component-design.tsx",
      version: "v2",
      type: "typescript",
    },
  ];

  // Load file content when preview file changes using $effect
  $effect(() => {
    if ($selectedPreviewFile) {
      loadFileContent($selectedPreviewFile);
    }
  });

  async function loadFileContent(filePath: string) {
    fileContent = null;
    fileLoadError = null;

    try {
      logger.info("Loading file content:", filePath);
      fileContent = await fileService.openFile(filePath);
    } catch (error) {
      logger.error("Failed to load file content:", error);
      fileLoadError = error instanceof Error ? error.message : "Unknown error";
    }
  }

  function handleEditContext() {
    contextInput = projectContext;
    isEditingContext = true;
  }

  function handleSaveContext() {
    projectContext = contextInput;
    isEditingContext = false;
    showToast("Project context updated", "success");
  }

  function handleCancelEdit() {
    contextInput = projectContext;
    isEditingContext = false;
  }

  function handleDownloadArtifact(fileName: string) {
    showToast(`Download ${fileName} functionality coming soon`, "info");
  }

  function handlePreviewFile(filePath: string) {
    // This would trigger the preview overlay
    showToast(`Preview ${filePath} functionality coming soon`, "info");
  }

  function handleDownload() {
    showToast("Download functionality coming soon", "info");
  }

  function handleShare() {
    showToast("Share functionality coming soon", "info");
  }

  function handleEdit() {
    showToast("Edit functionality coming soon", "info");
  }

  function handleRefresh() {
    if ($selectedPreviewFile) {
      loadFileContent($selectedPreviewFile);
    }
  }

  function clearPreview() {
    selectedPreviewFile.set(null);
    fileContent = null;
    fileLoadError = null;
  }

  function renderContextContent(text: string) {
    const parts = text.split(/(#[^\s]+)/g);

    return parts.map((part, index) => {
      if (part.startsWith("#")) {
        return {
          type: "file",
          content: part,
          key: index,
        };
      }
      return {
        type: "text",
        content: part,
        key: index,
      };
    });
  }

  function formatFileSize(content: string, isBase64: boolean = false): string {
    const bytes = isBase64 ? content.length : new Blob([content]).size;
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
</script>

<div class="w-96 bg-surface border-l border-border flex flex-col relative">
  <!-- Base Layer: Chat Control Panel -->
  <div class="flex h-full flex-col">
    <!-- Panel Header -->
    <div class="border-border flex h-12 items-center border-b px-4">
      <span class="text-muted text-xs font-semibold uppercase tracking-wide">
        Chat Control
      </span>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Project Context Section -->
      <div class="border-border border-b p-4">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-muted text-xs font-semibold tracking-wide">
            Project Context
          </h3>
          {#if !isEditingContext}
            <button
              onclick={handleEditContext}
              class="text-muted hover:text-accent text-xs"
              title="Edit"
            >
              <Pencil class="text-sm" />
            </button>
          {:else}
            <div class="flex items-center space-x-2">
              <button
                onclick={handleSaveContext}
                class="text-muted hover:text-accent text-xs"
                title="Save"
              >
                <CheckLg class="text-sm" />
              </button>
              <button
                onclick={handleCancelEdit}
                class="text-muted text-xs hover:text-red-400"
                title="Cancel"
              >
                <XLg class="text-sm" />
              </button>
            </div>
          {/if}
        </div>

        <!-- View Mode -->
        {#if !isEditingContext}
          <div
            onclick={handleEditContext}
            class="bg-input-background border-input-border text-muted hover:border-accent/50 min-h-[100px] cursor-text rounded border p-3 text-sm transition-colors"
          >
            {#each renderContextContent(projectContext) as part (part.key)}
              {#if part.type === "file"}
                <button
                  onclick={() => handlePreviewFile(part.content)}
                  class="text-accent hover:text-accent/80 mr-2 underline"
                >
                  {part.content}
                </button>
              {:else}
                <span>{part.content}</span>
              {/if}
            {/each}
          </div>
        {:else}
          <!-- Edit Mode -->
          <textarea
            bind:value={contextInput}
            rows="4"
            class="text-foreground bg-input-background border-input-border focus:border-accent placeholder-muted w-full resize-none rounded-md border px-3 py-2 text-sm focus:outline-none"
            placeholder="#<demo-project>/demo.md #/path/to/outside/file.md&#10;Text is also allowed"
            autofocus
          ></textarea>
        {/if}
      </div>

      <!-- Artifacts Section -->
      <div class="border-border border-b p-4">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-muted text-xs font-semibold tracking-wide">
            Artifacts
          </h3>
          <button
            onclick={() =>
              showToast(
                "Download all artifacts functionality coming soon",
                "info",
              )}
            class="text-muted hover:text-accent text-xs"
            title="Download All"
          >
            <Download class="text-sm" />
          </button>
        </div>

        <div class="space-y-2">
          {#each mockArtifacts as artifact (artifact.id)}
            <div
              class="bg-panel hover:bg-hover group flex cursor-pointer items-center justify-between rounded p-2"
              onclick={() => handlePreviewFile(artifact.fileName)}
            >
              <div class="flex items-center">
                <FileEarmark class="text-foreground mr-2 text-sm" />
                <span class="text-foreground text-sm">
                  {artifact.fileName}
                </span>
                <span class="text-muted ml-1 text-xs">
                  {artifact.version}
                </span>
              </div>
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  handleDownloadArtifact(artifact.fileName);
                }}
                class="text-muted hover:text-accent text-xs opacity-0 transition-opacity group-hover:opacity-100"
                title="Download"
              >
                <Download class="text-sm" />
              </button>
            </div>
          {/each}
        </div>

        {#if mockArtifacts.length === 0}
          <div class="text-muted py-4 text-center text-xs">
            No artifacts yet
          </div>
        {/if}
      </div>

      <!-- Additional sections can be added here -->
      <div class="p-4">
        <div class="text-muted text-xs">
          Additional chat controls and settings can be added here as needed.
        </div>
      </div>
    </div>
  </div>

  <!-- Overlay Layer: Preview Panel -->
  {#if $selectedPreviewFile}
    <div class="absolute inset-0 bg-surface z-20">
      <div class="flex h-full flex-col">
        <!-- Header -->
        <div
          class="border-border flex h-12 items-center justify-between border-b px-4"
        >
          <div class="flex items-center">
            <span class="text-foreground font-medium">
              {$selectedPreviewFile.split("/").pop()}
            </span>
            <span class="text-muted ml-2 text-xs">Preview</span>
          </div>
          <div class="flex items-center space-x-3">
            <button
              onclick={handleEdit}
              class="text-muted hover:text-accent"
              title="Edit"
            >
              <Pencil class="text-sm" />
            </button>
            <button
              onclick={handleDownload}
              class="text-muted hover:text-accent"
              title="Download"
            >
              <Download class="text-sm" />
            </button>
            <button
              onclick={handleShare}
              class="text-muted hover:text-accent"
              title="Share"
            >
              <Share class="text-sm" />
            </button>
            <button
              onclick={handleRefresh}
              disabled={$isLoadingOpenFile}
              class="text-muted hover:text-accent disabled:opacity-50"
              title="Refresh"
            >
              <ArrowClockwise class="text-sm" />
            </button>
            <button
              onclick={clearPreview}
              class="text-muted hover:text-accent"
              title="Close"
            >
              <XLg class="text-base" />
            </button>
          </div>
        </div>

        <!-- Content -->
        {#if $isLoadingOpenFile}
          <div class="flex flex-1 items-center justify-center">
            <div class="text-muted">Loading file...</div>
          </div>
        {:else if fileLoadError}
          <div class="flex flex-1 items-center justify-center">
            <div class="text-center text-red-400">
              <FileEarmark class="mx-auto mb-4 text-5xl" />
              <p class="mb-2">Failed to load file</p>
              <p class="text-muted mb-3 text-sm">
                {$selectedPreviewFile.split("/").pop()}
              </p>
              <p class="text-red-400 mb-3 text-sm">{fileLoadError}</p>
              <button
                onclick={handleRefresh}
                class="rounded border border-red-600/40 bg-red-600/20 px-3 py-1 text-sm text-red-400 hover:bg-red-600/30"
              >
                Try Again
              </button>
            </div>
          </div>
        {:else if fileContent}
          <div class="flex-1 overflow-y-auto p-4">
            {#if fileContent.isBase64}
              <div class="text-muted text-center">
                <div class="mb-2">Binary file preview not supported</div>
                <div class="text-sm">
                  File type: {fileContent.fileType}
                  <br />
                  Size: {formatFileSize(fileContent.content, true)}
                </div>
              </div>
            {:else}
              <div class="prose prose-invert max-w-none">
                {#if fileContent.fileType === "markdown"}
                  <!-- For markdown files, we could add proper markdown rendering here -->
                  <pre
                    class="text-foreground whitespace-pre-wrap break-words font-mono text-sm">{fileContent.content}</pre>
                {:else}
                  <pre
                    class="text-foreground whitespace-pre-wrap break-words font-mono text-sm">{fileContent.content}</pre>
                {/if}
              </div>
            {/if}
          </div>

          <!-- File info footer -->
          <div class="border-border text-muted bg-panel border-t p-2 text-xs">
            Type: {fileContent.fileType} | Size: {formatFileSize(
              fileContent.content,
              fileContent.isBase64,
            )}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
