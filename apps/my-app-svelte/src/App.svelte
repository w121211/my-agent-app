<!-- apps/my-app-svelte/src/App.svelte -->
<script lang="ts">
  import { Logger } from "tslog";
  // import MainLayout from "./components/MainLayout.svelte";
  import ToastProvider from "./components/ToastProvider.svelte";
  // import ErrorBoundary from "./components/ErrorBoundary.svelte";
  // import DevPanel from "./components/shared/DevPanel.svelte";
  import Demo from "./components/Demo.svelte";
  import { eventService } from "./services/event-service";
  // import { keyboardManager } from "./lib/keyboard";
  // import { DevelopmentTools } from "./lib/development";

  const logger = new Logger({ name: "App" });

  // Show demo in development mode
  const isDev = import.meta.env.DEV;
  const showDemo =
    isDev && new URLSearchParams(window.location.search).has("demo");

  // Use $effect instead of onMount for Svelte 5
  $effect(() => {
    logger.info("App mounted, initializing systems...");

    // Start event subscriptions
    eventService.start();

    // Initialize development tools in dev mode
    if (isDev) {
      // DevelopmentTools.getInstance();
    }

    // Setup keyboard shortcuts
    // keyboardManager.enable();

    // Cleanup on destroy
    return () => {
      logger.info("App unmounting, cleaning up...");
      eventService.stop();
      // keyboardManager.destroy();
    };
  });

  function handleError(error: Error, errorInfo: any) {
    logger.error("Application error:", error, errorInfo);

    // Send error to monitoring service in production
    if (import.meta.env.PROD) {
      // sendErrorToMonitoring(error, errorInfo)
    }
  }
</script>

<ToastProvider>
  <Demo />
</ToastProvider>

<!-- <ErrorBoundary onError={handleError}>
  <ToastProvider>
    {#if showDemo}
      <Demo />
    {:else}
      <MainLayout />
    {/if}

    Development tools (only shown in dev mode)
    <DevPanel />
  </ToastProvider>
</ErrorBoundary> -->

<!-- <style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-sans);
  }

  /* Smooth transitions for better UX */
  :global(*) {
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease;
  }

  /* Custom scrollbar styling */
  :global(::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }

  :global(::-webkit-scrollbar-track) {
    background: var(--color-surface);
  }

  :global(::-webkit-scrollbar-thumb) {
    background: var(--color-border);
    border-radius: 4px;
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: var(--color-muted);
  }

  /* Focus styles for accessibility */
  :global(:focus-visible) {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  /* Animation utilities */
  :global(.animate-in) {
    animation: slide-in 0.2s ease-out;
  }

  :global(.fade-in) {
    animation: fade-in 0.3s ease-out;
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Loading spinner */
  :global(.animate-pulse) {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style> -->
