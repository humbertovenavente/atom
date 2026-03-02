import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlowService } from '../../services/flow.service';
import { I18nService } from '../../services/i18n.service';
import type { FlowNode } from '@models/types';

const EMOJI_MAP: Record<string, string> = {
  target: '🎯',
  brain: '🧠',
  'check-circle': '✅',
  zap: '⚡',
  'message-circle': '💬',
  tool: '🔧',
  send: '✈️',
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
  telegram: '',
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
        @if (nodeType() === 'telegram') {
          <!-- Telegram-specific configuration -->
          <div>
            <label class="text-xs uppercase tracking-wider block mb-1" style="color: var(--text-secondary);">
              Bot Token
            </label>
            <input
              type="password"
              [value]="currentBotToken()"
              (input)="onBotTokenChange($event)"
              class="w-full text-sm rounded-lg p-3 outline-none focus:border-blue-500"
              style="background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-primary);"
              placeholder="123456789:ABCdef..." />
            <p class="text-xs mt-1" style="color: var(--text-tertiary);">Get your token from @BotFather on Telegram.</p>
          </div>

          <div>
            <label class="text-xs uppercase tracking-wider block mb-1" style="color: var(--text-secondary);">
              Webhook URL (auto)
            </label>
            <input
              type="text"
              [value]="webhookUrl()"
              readonly
              class="w-full text-xs rounded-lg p-3 cursor-default"
              style="background: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-primary);" />
          </div>

          <button
            (click)="registerWebhook()"
            [disabled]="registerStatus() === 'loading' || !currentBotToken()"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm py-2 px-4 rounded-lg transition-colors">
            @if (registerStatus() === 'loading') { Registering... }
            @else if (registerStatus() === 'success') { Webhook registered }
            @else if (registerStatus() === 'error') { Error — try again }
            @else { Register Webhook }
          </button>

          @if (registerStatus() === 'success') {
            <p class="text-xs text-green-400">Webhook registered. Telegram will send messages to this URL.</p>
          }
          @if (registerStatus() === 'error') {
            <p class="text-xs text-red-400">Registration failed. Verify the bot token is correct and the URL is HTTPS.</p>
          }
        } @else {
          <!-- System Prompt -->
          <div>
            <label class="text-xs uppercase tracking-wider block mb-1" style="color: var(--text-secondary);">
              {{ i18n.t('config.systemPrompt') }}
            </label>
            <textarea
              [value]="currentPrompt()"
              (input)="onPromptChange($event)"
              rows="8"
              class="w-full text-sm rounded-lg p-3 outline-none focus:border-blue-500 resize-none leading-relaxed"
              style="background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-primary);"
              [placeholder]="i18n.t('config.promptPlaceholder')">
            </textarea>
          </div>

          <!-- Temperature -->
          <div>
            <label class="text-xs uppercase tracking-wider block mb-1" style="color: var(--text-secondary);">
              {{ i18n.t('config.temperature') }}: {{ currentTemp() }}
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
              <span>{{ i18n.t('config.precise') }}</span>
              <span>{{ i18n.t('config.creative') }}</span>
            </div>
          </div>
        }

        <!-- Delete node -->
        <div class="pt-2 border-t" style="border-color: var(--border-primary);">
          <button
            (click)="deleteNode()"
            class="w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-red-400/30 hover:border-red-400/50 rounded-lg px-3 py-2 transition-all duration-150">
            {{ i18n.t('config.deleteNode') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NodeConfigPanelComponent {
  readonly nodeId = input.required<string>();
  private readonly flowService = inject(FlowService);
  readonly i18n = inject(I18nService);

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

  readonly currentBotToken = computed(() => this.node()?.data.config?.botToken ?? '');
  readonly webhookUrl = computed(() =>
    typeof window !== 'undefined' ? window.location.origin + '/api/telegram' : '/api/telegram'
  );
  readonly registerStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');

  close(): void {
    this.flowService.setSelectedNode(null);
  }

  onLabelChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.flowService.updateNodeLabel(this.nodeId(), value);
  }

  deleteNode(): void {
    if (window.confirm(this.i18n.t('config.deleteConfirm'))) {
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

  onBotTokenChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.flowService.updateNodeConfig(this.nodeId(), { botToken: value });
  }

  async registerWebhook(): Promise<void> {
    const token = this.currentBotToken();
    const url = this.webhookUrl();
    if (!token) return;
    this.registerStatus.set('loading');
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, drop_pending_updates: true }),
      });
      const data = await res.json() as { ok: boolean; description?: string };
      this.registerStatus.set(data.ok ? 'success' : 'error');
    } catch {
      this.registerStatus.set('error');
    }
  }
}
