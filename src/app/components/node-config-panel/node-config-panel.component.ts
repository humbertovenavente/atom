import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlowService } from '../../services/flow.service';
import type { FlowNode } from '@models/types';

const EMOJI_MAP: Record<string, string> = {
  target: '🎯',
  brain: '🧠',
  'check-circle': '✅',
  zap: '⚡',
  'message-circle': '💬',
  tool: '🔧',
};

const DEFAULT_PROMPTS: Record<string, string> = {
  orchestrator:
    'You are an intent orchestrator. Analyze the user message and determine which specialized agent should respond.',
  memory:
    'You are a memory agent. Retrieve and store relevant conversation context.',
  validator:
    'You are a validator. Verify that collected data is complete and correct before proceeding.',
  specialist:
    'You are a domain specialist. Provide precise and detailed answers about your area of expertise.',
  generic:
    'You are a general assistant. Respond helpfully and friendly when no specialist applies.',
  tool: 'You are a search tool. Query external sources and return structured data.',
};

@Component({
  selector: 'app-node-config-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="h-full flex flex-col border-r" style="background: var(--bg-secondary); color: var(--text-primary); border-color: var(--border-primary);">
      <!-- Header -->
      <div class="px-4 py-3 border-b flex items-center justify-between" style="border-color: var(--border-primary);">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-lg flex-shrink-0">{{ emoji() }}</span>
          <span class="text-sm font-medium truncate">{{ nodeLabel() }}</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full border flex-shrink-0"
            [style.borderColor]="nodeColor()"
            [style.color]="nodeColor()">
            {{ nodeType() }}
          </span>
        </div>
        <button
          (click)="close()"
          class="text-xl leading-none flex-shrink-0 ml-2 transition-colors"
          style="color: var(--text-secondary);"
          title="Close configuration">
          &times;
        </button>
      </div>

      <!-- Form body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- System Prompt -->
        <div>
          <label class="text-xs uppercase tracking-wider block mb-1" style="color: var(--text-secondary);">
            System Prompt
          </label>
          <textarea
            [value]="currentPrompt()"
            (input)="onPromptChange($event)"
            rows="8"
            class="w-full text-sm rounded-lg p-3 outline-none focus:border-blue-500 resize-none leading-relaxed"
            style="background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-primary);"
            placeholder="System instructions for this agent...">
          </textarea>
        </div>

        <!-- Temperature -->
        <div>
          <label class="text-xs uppercase tracking-wider block mb-1" style="color: var(--text-secondary);">
            Temperature: {{ currentTemp() }}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            [value]="currentTemp()"
            (input)="onTempChange($event)"
            class="w-full accent-blue-500" />
          <div class="flex justify-between text-xs mt-1" style="color: var(--text-tertiary);">
            <span>0 (precise)</span>
            <span>2 (creative)</span>
          </div>
        </div>

        <!-- Delete node -->
        <div class="pt-2 border-t" style="border-color: var(--border-primary);">
          <button
            (click)="deleteNode()"
            class="w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-red-400/30 hover:border-red-400/50 rounded-lg px-3 py-2 transition-all duration-150">
            Delete Node
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NodeConfigPanelComponent {
  readonly nodeId = input.required<string>();
  private readonly flowService = inject(FlowService);

  readonly node = computed<FlowNode | undefined>(() =>
    this.flowService.nodes().find((n) => n.id === this.nodeId())
  );

  readonly emoji = computed(() => EMOJI_MAP[this.node()?.data.icon ?? ''] ?? '📦');
  readonly nodeLabel = computed(() => this.node()?.data.label ?? '');
  readonly nodeColor = computed(() => this.node()?.data.color ?? '#6B7280');
  readonly nodeType = computed(() => this.node()?.type ?? '');

  readonly currentPrompt = computed(
    () =>
      this.node()?.data.config?.systemPrompt ??
      DEFAULT_PROMPTS[this.node()?.type ?? ''] ??
      ''
  );

  readonly currentTemp = computed(() => this.node()?.data.config?.temperature ?? 0.3);

  close(): void {
    this.flowService.setSelectedNode(null);
  }

  onLabelChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.flowService.updateNodeLabel(this.nodeId(), value);
  }

  deleteNode(): void {
    if (window.confirm('Delete this node?')) {
      this.flowService.setSelectedNode(null);
      this.flowService.removeNode(this.nodeId());
    }
  }

  onPromptChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.flowService.updateNodeConfig(this.nodeId(), { systemPrompt: value });
  }

  onTempChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.flowService.updateNodeConfig(this.nodeId(), { temperature: value });
  }
}
