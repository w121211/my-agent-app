<!-- apps/my-app-svelte/src/components/shared/ToastProvider.svelte -->
<script lang="ts">
  import { toasts, removeToast, getToastClassName } from "../stores/ui-store";
  import {
    XLg,
    CheckCircleFill,
    ExclamationTriangleFill,
    InfoCircleFill,
  } from "svelte-bootstrap-icons";

  interface ToastProps {
    children: any;
  }

  let { children }: ToastProps = $props();

  function getIconComponent(type: string) {
    switch (type) {
      case "success":
        return CheckCircleFill;
      case "error":
      case "warning":
        return ExclamationTriangleFill;
      case "info":
      default:
        return InfoCircleFill;
    }
  }

  function handleToastClick(toastId: string) {
    removeToast(toastId);
  }

  function getToastTitle(type: string): string {
    switch (type) {
      case "success":
        return "Success";
      case "error":
        return "Error";
      case "warning":
        return "Warning";
      case "info":
      default:
        return "Info";
    }
  }
</script>

<!-- Main content -->
{@render children()}

<!-- Toast container -->
{#if $toasts.length > 0}
  <div class="fixed right-4 top-4 z-50 flex flex-col gap-2">
    {#each $toasts as toast (toast.id)}
      {@const IconComponent = getIconComponent(toast.type)}
      <div
        class="w-full max-w-sm rounded-lg border p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 {getToastClassName(
          toast.type,
        )}"
        role="alert"
      >
        <div class="flex items-start justify-between">
          <div class="flex flex-1 items-start space-x-3">
            <IconComponent class="text-base mt-0.5 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="text-foreground text-sm font-medium">
                {getToastTitle(toast.type)}
              </div>
              <div class="text-muted mt-1 text-sm break-words">
                {toast.message}
              </div>
            </div>
          </div>
          <button
            onclick={() => handleToastClick(toast.id)}
            class="text-muted hover:text-accent ml-2 transition-colors flex-shrink-0"
            aria-label="Close notification"
          >
            <XLg class="text-base" />
          </button>
        </div>
      </div>
    {/each}
  </div>
{/if}
