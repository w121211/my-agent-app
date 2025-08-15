<script lang="ts">
  import type { LanguageModelV2ToolResultOutput } from "@ai-sdk/provider";

  interface Props {
    output: LanguageModelV2ToolResultOutput;
  }

  let { output }: Props = $props();
</script>

// apps/my-app-svelte/src/components/ToolResultDisplay.svelte
<div class="text-xs text-green-600 mt-1">
  {#if output.type === "text"}
    <pre class="whitespace-pre-wrap">{output.value}</pre>
  {:else if output.type === "json"}
    <pre class="whitespace-pre-wrap">{JSON.stringify(
        output.value,
        null,
        2,
      )}</pre>
  {:else if output.type === "error-text"}
    <div class="text-red-600">Error: {output.value}</div>
  {:else if output.type === "error-json"}
    <div class="text-red-600">
      Error: {JSON.stringify(output.value, null, 2)}
    </div>
  {:else if output.type === "content"}
    {#each output.value as contentItem}
      {#if contentItem.type === "text"}
        <pre class="whitespace-pre-wrap">{contentItem.text}</pre>
      {:else if contentItem.type === "media"}
        <img
          src="data:{contentItem.mediaType};base64,{contentItem.data}"
          alt="Tool result media"
          class="max-w-full h-auto"
        />
      {/if}
    {/each}
  {:else}
    <pre class="whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
  {/if}
</div>
