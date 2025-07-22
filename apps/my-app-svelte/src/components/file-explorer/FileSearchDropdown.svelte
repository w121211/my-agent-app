<!-- apps/my-app-svelte/src/components/FileSearchDropdown.svelte -->
<script lang="ts">
  interface FileSearchResult {
    name: string;
    relativePath: string;
    absolutePath: string;
    score?: number;
    highlight?: string;
  }

  interface Props {
    results: FileSearchResult[];
    selectedIndex: number;
    visible: boolean;
    loading?: boolean;
    onselect: (result: FileSearchResult) => void;
    oncancel: () => void;
    onhover: (index: number) => void;
  }

  let { results, selectedIndex, visible, loading = false, onselect, oncancel, onhover }: Props = $props();

  function handleSelect(result: FileSearchResult) {
    onselect(result);
  }

  function handleCancel() {
    oncancel();
  }

  // Handle mouse enter to update selected index
  function handleMouseEnter(index: number) {
    onhover(index);
  }
</script>

{#if visible}
  <div class="absolute top-full left-0 right-0 mt-1 z-50">
    <div class="bg-panel border-border shadow-lg rounded-md border max-h-60 overflow-y-auto">
      {#if loading}
        <div class="px-3 py-2 text-muted text-sm">
          <div class="flex items-center gap-2">
            <div class="animate-spin h-3 w-3 border border-accent border-t-transparent rounded-full"></div>
            Searching files...
          </div>
        </div>
      {:else if results.length === 0}
        <div class="px-3 py-2 text-muted text-sm">
          No files found
        </div>
      {:else}
        {#each results as result, index}
          <button
            class="w-full text-left px-3 py-2 hover:bg-hover focus:bg-hover focus:outline-none {selectedIndex === index ? 'bg-hover' : ''}"
            onclick={() => handleSelect(result)}
            onmouseenter={() => handleMouseEnter(index)}
          >
            <div class="flex flex-col">
              <div class="text-foreground text-sm font-medium">
                {#if result.highlight}
                  {@html result.highlight}
                {:else}
                  {result.name}
                {/if}
              </div>
              {#if result.relativePath !== result.name}
                <div class="text-muted text-xs">
                  {result.relativePath}
                </div>
              {/if}
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}