<!-- src/components/ToolCallDemo.svelte -->
<script lang="ts">
  import ToolCallMessage from './tool-calls/ToolCallMessage.svelte';
  import ToolCallItem from './tool-calls/ToolCallItem.svelte';
  import OverallStatusBadge from './tool-calls/OverallStatusBadge.svelte';
  import StatusIcon from './tool-calls/StatusIcon.svelte';
  import PermissionConfirmation from './tool-calls/PermissionConfirmation.svelte';
  import ResultDisplay from './tool-calls/ResultDisplay.svelte';
  import type { ToolCall, ToolCallStatus } from '../types/tool-call.types';

  // Mock data for different tool call states
  const mockToolCalls: ToolCall[] = [
    // Awaiting approval
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
    
    // Executing
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
    
    // Success
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
    },
    
    // Error
    {
      status: 'error',
      request: {
        callId: 'tc-004',
        name: 'database_query',
        args: {
          query: 'SELECT * FROM users WHERE invalid_column = ?',
          params: ['test']
        }
      },
      response: {
        callId: 'tc-004',
        result: null,
        error: 'Column "invalid_column" does not exist in table "users"',
        timestamp: new Date()
      },
      durationMs: 1200,
      startTime: Date.now() - 8000
    },
    
    // Cancelled
    {
      status: 'cancelled',
      request: {
        callId: 'tc-005',
        name: 'large_file_download',
        args: {
          url: 'https://example.com/large-file.zip',
          destination: '/tmp/download.zip'
        }
      },
      response: {
        callId: 'tc-005',
        result: null,
        error: 'Operation cancelled by user',
        timestamp: new Date()
      },
      durationMs: 2100,
      outcome: 'cancelled'
    },
    
    // Validating
    {
      status: 'validating',
      request: {
        callId: 'tc-006',
        name: 'git_commit',
        args: {
          message: 'feat: Add new feature implementation',
          files: ['src/feature.ts', 'tests/feature.test.ts']
        }
      }
    },
    
    // Scheduled
    {
      status: 'scheduled',
      request: {
        callId: 'tc-007',
        name: 'deploy_staging',
        args: {
          branch: 'develop',
          environment: 'staging'
        }
      }
    }
  ];

  // Mock handlers
  function handleApprove() {
    console.log('Tool call approved');
  }

  function handleDeny() {
    console.log('Tool call denied');
  }

  function handleRetry() {
    console.log('Tool call retry requested');
  }

  // Status examples for StatusIcon demo
  const statusExamples: ToolCallStatus[] = [
    'validating',
    'scheduled', 
    'awaiting_approval',
    'executing',
    'success',
    'error',
    'cancelled'
  ];
</script>

<div class="p-8 max-w-4xl mx-auto space-y-8">
  <header class="text-center">
    <h1 class="text-3xl font-bold text-foreground mb-2">Tool Call Components Demo</h1>
    <p class="text-muted">展示所有 tool call 相關元件的不同狀態</p>
  </header>

  <!-- Overall Status Badge Examples -->
  <section>
    <h2 class="text-xl font-semibold text-foreground mb-4">Overall Status Badges</h2>
    <div class="space-y-4">
      <div>
        <p class="text-sm text-muted mb-2">Mixed states (7 tool calls):</p>
        <OverallStatusBadge toolCalls={mockToolCalls} />
      </div>
      <div>
        <p class="text-sm text-muted mb-2">All successful:</p>
        <OverallStatusBadge toolCalls={[mockToolCalls[2]]} />
      </div>
      <div>
        <p class="text-sm text-muted mb-2">Has failures:</p>
        <OverallStatusBadge toolCalls={[mockToolCalls[3], mockToolCalls[4]]} />
      </div>
      <div>
        <p class="text-sm text-muted mb-2">Awaiting approval:</p>
        <OverallStatusBadge toolCalls={[mockToolCalls[0]]} />
      </div>
    </div>
  </section>

  <!-- Status Icons -->
  <section>
    <h2 class="text-xl font-semibold text-foreground mb-4">Status Icons</h2>
    <div class="grid grid-cols-7 gap-4">
      {#each statusExamples as status}
        <div class="text-center">
          <StatusIcon {status} />
          <p class="text-xs text-muted mt-1">{status}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Individual Tool Call Items -->
  <section>
    <h2 class="text-xl font-semibold text-foreground mb-4">Tool Call Items</h2>
    <div class="space-y-4">
      {#each mockToolCalls as toolCall}
        <div>
          <h3 class="text-sm font-medium text-muted mb-2">{toolCall.status.toUpperCase()} State:</h3>
          <ToolCallItem 
            {toolCall} 
            onApprove={handleApprove} 
            onDeny={handleDeny} 
            onRetry={handleRetry} 
          />
        </div>
      {/each}
    </div>
  </section>

  <!-- Standalone Permission Confirmation -->
  <section>
    <h2 class="text-xl font-semibold text-foreground mb-4">Permission Confirmation Variants</h2>
    <div class="space-y-6">
      <!-- High danger level -->
      <div>
        <h3 class="text-sm font-medium text-muted mb-2">High Danger Level:</h3>
        <PermissionConfirmation
          confirmationDetails={{
            message: 'Delete entire project directory',
            dangerLevel: 'high',
            affectedResources: ['/project/', '/project/src/', '/project/package.json'],
            previewChanges: 'This action will permanently delete:\n- All source code\n- Configuration files\n- Dependencies\n\nThis action cannot be undone!'
          }}
          onApprove={handleApprove}
          onDeny={handleDeny}
        />
      </div>

      <!-- Low danger level -->
      <div>
        <h3 class="text-sm font-medium text-muted mb-2">Low Danger Level:</h3>
        <PermissionConfirmation
          confirmationDetails={{
            message: 'Read configuration file',
            dangerLevel: 'low',
            affectedResources: ['config.json'],
            previewChanges: 'Will read contents of config.json for analysis'
          }}
          onApprove={handleApprove}
          onDeny={handleDeny}
        />
      </div>
    </div>
  </section>

  <!-- Standalone Result Displays -->
  <section>
    <h2 class="text-xl font-semibold text-foreground mb-4">Result Display Variants</h2>
    <div class="space-y-6">
      {#each [mockToolCalls[2], mockToolCalls[3], mockToolCalls[4]] as toolCall}
        <div>
          <h3 class="text-sm font-medium text-muted mb-2">{toolCall.status.toUpperCase()} Result:</h3>
          <ResultDisplay {toolCall} onRetry={handleRetry} />
        </div>
      {/each}
    </div>
  </section>

  <!-- Complete ToolCallMessage Examples -->
  <section>
    <h2 class="text-xl font-semibold text-foreground mb-4">Complete ToolCallMessage</h2>
    <div class="space-y-4">
      <div>
        <h3 class="text-sm font-medium text-muted mb-2">Message with Mixed Tool Calls:</h3>
        <div class="bg-surface rounded-lg p-1">
          <!-- This would typically use the store, but for demo we'll simulate -->
          <div class="bg-surface border-border rounded-lg p-4 border mb-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8.5 2.5a.5.5 0 0 0-1 0V5h-2A1.5 1.5 0 0 0 4 6.5v3A1.5 1.5 0 0 0 5.5 11h2v2.5a.5.5 0 0 0 1 0V11h2A1.5 1.5 0 0 0 12 9.5v-3A1.5 1.5 0 0 0 10.5 5h-2V2.5Z"/>
                </svg>
                <span class="text-accent font-medium">Function Calls</span>
                <OverallStatusBadge toolCalls={mockToolCalls} />
              </div>
              <button class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                Cancel All
              </button>
            </div>
            
            <div class="space-y-3">
              {#each mockToolCalls.slice(0, 3) as toolCall}
                <ToolCallItem {toolCall} onApprove={handleApprove} onDeny={handleDeny} onRetry={handleRetry} />
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer class="text-center pt-8 border-t border-border">
    <p class="text-sm text-muted">Tool Call Components Demo - 所有狀態展示完成</p>
  </footer>
</div>