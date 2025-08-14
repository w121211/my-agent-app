<script lang="ts">
  import { createCounter } from "./counter.svelte.js";

  const counter = createCounter();
</script>

<button on:click={counter.increment}>
  clicks: {counter.count}
</button>
