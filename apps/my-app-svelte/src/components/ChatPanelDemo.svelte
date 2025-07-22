<!-- apps/my-app-svelte/src/components/ChatPanelDemo.svelte -->
<script lang="ts">
  import { tick } from "svelte";
  import ToolCallMessage from "./tool-calls/ToolCallMessage.svelte";
  import type { ChatMessage } from "../services/chat-service";
  import type { ToolCall } from "../types/tool-call.types";
  import { 
    Send, 
    ChatDots, 
    Copy, 
    ThreeDots, 
    HouseDoor, 
    ChevronRight,
    ArrowClockwise
  } from "svelte-bootstrap-icons";
  import { getMessageToolCalls } from '../stores/tool-call-store';

  let messagesContainer = $state<HTMLDivElement>();

  // Mock tool calls for demo
  const mockToolCalls: ToolCall[] = [
    {
      status: 'awaiting_approval',
      request: {
        callId: 'tc-001',
        name: 'write_file',
        args: {
          path: '/project/src/utils/helper.ts',
          content: 'export function formatDate(date: Date): string {\n  return date.toISOString().split("T")[0];\n}'
        }
      },
      confirmationDetails: {
        message: 'Write to file: /project/src/utils/helper.ts',
        dangerLevel: 'medium',
        affectedResources: ['/project/src/utils/helper.ts'],
        previewChanges: 'export function formatDate(date: Date): string {\n  return date.toISOString().split("T")[0];\n}'
      }
    },
    {
      status: 'executing',
      request: {
        callId: 'tc-002',
        name: 'run_tests',
        args: {
          testPath: 'src/tests/',
          coverage: true
        }
      },
      startTime: Date.now() - 3000,
      liveOutput: 'Running test suite...\n✓ utils.test.ts\n✓ components.test.ts\nRunning coverage analysis...'
    },
    {
      status: 'success',
      request: {
        callId: 'tc-003',
        name: 'calculator',
        args: {
          operation: 'multiply',
          a: 12,
          b: 8
        }
      },
      response: {
        callId: 'tc-003',
        result: {
          operation: 'multiply',
          operands: [12, 8],
          result: 96
        },
        error: null,
        timestamp: new Date()
      },
      durationMs: 245,
      startTime: Date.now() - 5000
    }
  ];

  // Mock chat messages including tool calls
  const demoMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      role: 'USER',
      content: 'Help me create a utility function for date formatting and run some tests',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      metadata: {}
    },
    {
      id: 'msg-2', 
      role: 'ASSISTANT',
      content: 'I\'ll help you create a date formatting utility function and run tests. Let me break this down into several steps:',
      timestamp: new Date(Date.now() - 280000),
      metadata: {}
    },
    {
      id: 'msg-3',
      role: 'TOOL_CALL',
      content: '',
      timestamp: new Date(Date.now() - 270000),
      metadata: {}
    },
    {
      id: 'msg-4',
      role: 'ASSISTANT',
      content: 'Great! I\'ve created the date formatting utility and run the test suite. The calculator also completed successfully. All tests are passing with good coverage!',
      timestamp: new Date(Date.now() - 30000),
      metadata: {}
    },
    {
      id: 'msg-5',
      role: 'USER', 
      content: 'Perfect! Can you also help me with error handling for the date function?',
      timestamp: new Date(Date.now() - 10000),
      metadata: {}
    }
  ];

  // Mock stores for demo
  function createMockMessageToolCalls(messageId: string) {
    if (messageId === 'msg-3') {
      return {
        subscribe: (callback: (toolCalls: ToolCall[]) => void) => {
          callback(mockToolCalls);
          return { unsubscribe: () => {} };
        }
      };
    }
    return {
      subscribe: (callback: (toolCalls: ToolCall[]) => void) => {
        callback([]);
        return { unsubscribe: () => {} };
      }
    };
  }

  // Auto-scroll to bottom when new messages arrive
  $effect(() => {
    if (demoMessages && messagesContainer) {
      tick().then(() => {
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      });
    }
  });

  function formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleCopyMessage(content: string) {
    navigator.clipboard.writeText(content);
    console.log("Message copied to clipboard");
  }

  function handleEditMessage() {
    console.log("Edit functionality not implemented yet");
  }

  function handleMoreAction(action: string) {
    console.log(`${action} functionality coming soon`);
  }

  // Mock tool call handlers
  function handleToolCallAction(toolCallId: string, action: 'approve' | 'deny' | 'retry') {
    console.log(`Handling ${action} for tool call ${toolCallId}`);
  }

  function handleCancelAll() {
    console.log('All tool calls cancelled');
  }
</script>

<div class="bg-background flex min-w-0 flex-1 flex-col">
  <!-- Breadcrumb Header -->
  <header class="bg-surface border-border flex h-12 items-center gap-2 border-b px-4">
    <HouseDoor class="text-muted text-sm" />
    <span class="text-muted text-xs">demo</span>
    <ChevronRight class="text-muted text-xs" />
    <span class="text-muted text-xs">tool-call-demo.chat.json</span>
    <div class="ml-auto flex items-center space-x-2">
      <button class="bg-panel hover:bg-hover text-muted rounded px-2 py-1 text-xs">
        <ArrowClockwise class="text-xs" />
        Refresh
      </button>
      <div class="text-muted text-xs">
        <span class="text-green-400">🟢 Demo Mode</span>
      </div>
    </div>
  </header>

  <!-- Messages Area -->
  <div bind:this={messagesContainer} class="bg-background flex-1 space-y-5 overflow-y-auto px-8 py-6">
    {#each demoMessages as message (message.id)}
      {#if message.role === "FUNCTION_CALL" || message.role === "TOOL_CALL"}
        <!-- Tool Call Message Demo -->
        <div class="bg-surface border-border rounded-lg p-4 border mb-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8.5 2.5a.5.5 0 0 0-1 0V5h-2A1.5 1.5 0 0 0 4 6.5v3A1.5 1.5 0 0 0 5.5 11h2v2.5a.5.5 0 0 0 1 0V11h2A1.5 1.5 0 0 0 12 9.5v-3A1.5 1.5 0 0 0 10.5 5h-2V2.5Z"/>
              </svg>
              <span class="text-accent font-medium">Function Calls</span>
              <div class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                <span class="font-medium">Mixed</span>
                <span class="text-opacity-75">(1/3)</span>
              </div>
            </div>
            <button class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
              Cancel All
            </button>
          </div>
          
          <div class="space-y-3">
            {#each mockToolCalls as toolCall}
              <div class="border p-3 mb-2">
                <!-- Tool basic information -->
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-foreground">{toolCall.request.name}</span>
                    {#if toolCall.durationMs}
                      <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {toolCall.durationMs < 1000 ? `${toolCall.durationMs}ms` : `${(toolCall.durationMs / 1000).toFixed(1)}s`}
                      </span>
                    {/if}
                  </div>
                  <div class="flex items-center justify-center w-6 h-6">
                    {#if toolCall.status === 'awaiting_approval'}
                      <svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-2.008 0L.127 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z"/>
                        <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995z"/>
                      </svg>
                    {:else if toolCall.status === 'executing'}
                      <div class="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                    {:else if toolCall.status === 'success'}
                      <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                      </svg>
                    {/if}
                  </div>
                </div>

                <!-- Tool arguments (collapsible) -->
                <details class="mb-3 border border-gray-200 rounded">
                  <summary class="px-3 py-2 bg-gray-50 cursor-pointer text-sm font-medium hover:bg-gray-100">Arguments</summary>
                  <pre class="p-3 text-xs font-mono bg-white overflow-x-auto">{JSON.stringify(toolCall.request.args, null, 2)}</pre>
                </details>

                <!-- Permission confirmation area -->
                {#if toolCall.status === 'awaiting_approval' && toolCall.confirmationDetails}
                  <div class="bg-background border rounded-md p-4 mt-3 space-y-3 border-orange-300 bg-orange-50">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                      </svg>
                      <span class="font-medium text-foreground flex-1">Permission Required</span>
                      <span class="px-2 py-1 text-xs font-bold rounded bg-orange-200 text-orange-800">MEDIUM</span>
                    </div>

                    <div class="text-foreground">
                      <p>{toolCall.confirmationDetails.message}</p>
                    </div>

                    <div class="space-y-2">
                      <div class="flex items-center gap-2 text-sm font-medium text-muted">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        </svg>
                        <span>Affected Resources:</span>
                      </div>
                      <ul class="space-y-1 ml-6">
                        {#each toolCall.confirmationDetails.affectedResources as resource}
                          <li class="text-sm font-mono text-foreground bg-background px-2 py-1 rounded border">{resource}</li>
                        {/each}
                      </ul>
                    </div>

                    <details class="border border-gray-200 rounded">
                      <summary class="px-3 py-2 bg-gray-50 cursor-pointer text-sm font-medium hover:bg-gray-100">Preview Changes</summary>
                      <pre class="p-3 text-xs font-mono bg-white overflow-x-auto max-h-40">{toolCall.confirmationDetails.previewChanges}</pre>
                    </details>

                    <div class="flex gap-2 pt-2">
                      <button class="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors">
                        Allow
                      </button>
                      <button class="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors">
                        Deny
                      </button>
                    </div>
                  </div>
                {/if}

                <!-- Execution progress -->
                {#if toolCall.status === 'executing'}
                  <div class="bg-blue-100 rounded-md p-3 mt-3 space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                          <path d="M6.271 5.055a.5.5 0 0 1 .52.014L11 7.055a.5.5 0 0 1 0 .89L6.791 9.931a.5.5 0 0 1-.791-.393V5.604a.5.5 0 0 1 .271-.549z"/>
                        </svg>
                        <span class="text-sm font-medium text-blue-800">Executing...</span>
                      </div>
                      <span class="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded">3.0s</span>
                    </div>

                    <div class="w-full">
                      <div class="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div class="progress-bar-fill h-full bg-blue-500 animate-pulse"></div>
                      </div>
                    </div>

                    {#if toolCall.liveOutput}
                      <div class="bg-white border border-blue-200 rounded">
                        <div class="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-200">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm12-1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h12z"/>
                            <path d="M6.854 7.146a.5.5 0 1 0-.708.708L7.293 9l-1.147 1.146a.5.5 0 0 0 .708.708L8 9.707l1.146 1.147a.5.5 0 0 0 .708-.708L8.707 9l1.147-1.146a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146z"/>
                          </svg>
                          <span class="text-sm font-medium text-blue-800">Live Output</span>
                        </div>
                        <div class="max-h-40 overflow-y-auto">
                          <pre class="p-3 text-xs font-mono text-gray-800 whitespace-pre-wrap">{toolCall.liveOutput}</pre>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/if}

                <!-- Result display -->
                {#if toolCall.status === 'success'}
                  <div class="rounded-md p-3 mt-3 border bg-green-50 border-green-200">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                        </svg>
                        <span class="font-medium text-foreground">Success</span>
                        <span class="text-xs text-muted bg-surface px-2 py-1 rounded">245ms</span>
                      </div>
                    </div>

                    <div class="bg-background border rounded max-h-60 overflow-y-auto">
                      <pre class="p-3 text-sm font-mono text-foreground whitespace-pre-wrap">{JSON.stringify(toolCall.response?.result, null, 2)}</pre>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

      {:else if message.role === "USER"}
        <!-- User Message -->
        <div class="group flex flex-col items-end">
          <div class="bg-accent/20 border-accent/30 text-foreground ml-auto max-w-xl rounded-lg border px-4 py-2">
            <div class="leading-normal whitespace-pre-wrap">{message.content}</div>
            <div class="text-accent/60 mt-2 text-xs">{formatTimestamp(message.timestamp)}</div>
          </div>
          <div class="mt-1 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100 mr-2">
            <button onclick={() => handleCopyMessage(message.content)} class="text-muted hover:text-accent" title="Copy">
              <Copy class="text-sm" />
            </button>
            <button onclick={() => handleMoreAction("More options")} class="text-muted hover:text-accent" title="More">
              <ThreeDots class="text-sm" />
            </button>
          </div>
        </div>
      {:else}
        <!-- Assistant Message -->
        <div class="group flex flex-col items-start">
          <div class="mb-0.5 flex items-center gap-2">
            <span class="bg-accent flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white">C</span>
            <span class="text-muted text-xs font-medium">Claude Sonnet 4</span>
            <span class="text-muted text-xs">{formatTimestamp(message.timestamp)}</span>
          </div>
          <div class="text-foreground pl-7 leading-normal">
            <div class="whitespace-pre-wrap">{message.content}</div>
          </div>
          <div class="mt-1 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100 ml-7">
            <button onclick={() => handleCopyMessage(message.content)} class="text-muted hover:text-accent" title="Copy">
              <Copy class="text-sm" />
            </button>
            <button onclick={() => handleMoreAction("More options")} class="text-muted hover:text-accent" title="More">
              <ThreeDots class="text-sm" />
            </button>
          </div>
        </div>
      {/if}
    {/each}
  </div>

  <!-- Input Area (disabled in demo) -->
  <footer class="border-border bg-panel border-t px-6 py-4">
    <div class="relative">
      <textarea
        placeholder="Demo mode - input disabled"
        class="bg-input-background border-input-border text-muted w-full resize-none rounded-md border px-3 py-3 text-[15px] opacity-50"
        rows="3"
        disabled
      ></textarea>
    </div>
    <div class="mt-2 flex flex-wrap items-center gap-3">
      <span class="text-muted text-xs">🎭 Tool Call Demo Mode - Showing different states of tool execution</span>
    </div>
  </footer>
</div>

<style>
  .progress-bar-fill {
    background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%);
    animation: progress-sweep 2s ease-in-out infinite;
  }

  @keyframes progress-sweep {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(0%); }
    100% { transform: translateX(100%); }
  }
</style>