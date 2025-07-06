<!-- apps/my-app-svelte/src/components/shared/KeyboardShortcuts.svelte -->
<script lang="ts">
  import { keyboardManager } from "../lib/keyboard";
  import { Keyboard } from "svelte-bootstrap-icons";

  let showShortcuts = $state(false);
  let shortcuts = $state<Array<{ key: string; description: string }>>([]);

  // Use $effect instead of onMount for Svelte 5
  $effect(() => {
    shortcuts = keyboardManager.getShortcuts().map((s) => {
      const keys = [];
      if (s.ctrlKey) keys.push("Ctrl");
      if (s.shiftKey) keys.push("Shift");
      if (s.altKey) keys.push("Alt");
      if (s.metaKey) keys.push("Cmd");
      keys.push(s.key.toUpperCase());

      return {
        key: keys.join("+"),
        description: s.description,
      };
    });
  });

  function toggleShortcuts() {
    showShortcuts = !showShortcuts;
  }
</script>

<button
  onclick={toggleShortcuts}
  class="text-muted hover:text-accent flex items-center text-xs"
  title="Keyboard Shortcuts (Ctrl+/)"
>
  <Keyboard class="mr-1 text-sm" />
  Shortcuts
</button>

{#if showShortcuts}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div
      class="bg-surface border-border max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg border p-6 shadow-xl"
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-foreground text-lg font-semibold">
          Keyboard Shortcuts
        </h2>
        <button
          onclick={toggleShortcuts}
          class="text-muted hover:text-accent"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div class="space-y-2">
        {#each shortcuts as shortcut}
          <div class="flex items-center justify-between">
            <span class="text-muted text-sm">{shortcut.description}</span>
            <kbd
              class="bg-panel border-border rounded border px-2 py-1 text-xs font-mono"
            >
              {shortcut.key}
            </kbd>
          </div>
        {/each}
      </div>

      <div class="mt-4 pt-4 border-t border-border">
        <p class="text-muted text-xs">
          Press <kbd class="bg-panel border-border rounded border px-1"
            >Ctrl+/</kbd
          > to toggle this dialog
        </p>
      </div>
    </div>
  </div>
{/if}
