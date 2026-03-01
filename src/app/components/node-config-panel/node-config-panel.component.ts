import { Component, computed, inject, input, signal } from '@angular/core';
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
  send: '✈️',
};

const DEFAULT_PROMPTS: Record<string, string> = {
  orchestrator:
    'Eres un orquestador de intención. Analiza el mensaje del usuario y determina cuál agente especializado debe responder.',
  memory:
    'Eres un agente de memoria. Recupera y almacena el contexto relevante de la conversación.',
  validator:
    'Eres un validador. Verifica que los datos recopilados sean completos y correctos antes de continuar.',
  specialist:
    'Eres un especialista en tu dominio. Proporciona respuestas precisas y detalladas sobre tu área de expertise.',
  generic:
    'Eres un asistente general. Responde de forma útil y amigable cuando ningún especialista aplique.',
  tool: 'Eres una herramienta de búsqueda. Consulta fuentes externas y devuelve datos estructurados.',
  telegram: '',
};

@Component({
  selector: 'app-node-config-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="h-full bg-gray-900 text-white border-r border-gray-700 flex flex-col">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
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
          class="text-gray-400 hover:text-white text-xl leading-none flex-shrink-0 ml-2"
          title="Cerrar configuración">
          &times;
        </button>
      </div>

      <!-- Form body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        @if (nodeType() === 'telegram') {
          <!-- Telegram-specific configuration -->
          <div>
            <label class="text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Bot Token
            </label>
            <input
              type="password"
              [value]="currentBotToken()"
              (input)="onBotTokenChange($event)"
              class="w-full bg-gray-800 text-white text-sm rounded-lg p-3 border border-gray-600 outline-none focus:border-blue-500"
              placeholder="123456789:ABCdef..." />
            <p class="text-xs text-gray-500 mt-1">Obtén tu token en @BotFather en Telegram.</p>
          </div>

          <div>
            <label class="text-xs text-gray-400 uppercase tracking-wider block mb-1">
              Webhook URL (auto)
            </label>
            <input
              type="text"
              [value]="webhookUrl()"
              readonly
              class="w-full bg-gray-700 text-gray-300 text-xs rounded-lg p-3 border border-gray-600 cursor-default" />
          </div>

          <button
            (click)="registerWebhook()"
            [disabled]="registerStatus() === 'loading' || !currentBotToken()"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm py-2 px-4 rounded-lg transition-colors">
            @if (registerStatus() === 'loading') { Registrando... }
            @else if (registerStatus() === 'success') { Webhook registrado }
            @else if (registerStatus() === 'error') { Error — intentar de nuevo }
            @else { Registrar Webhook }
          </button>

          @if (registerStatus() === 'success') {
            <p class="text-xs text-green-400">El webhook fue registrado. Telegram enviará mensajes a esta URL.</p>
          }
          @if (registerStatus() === 'error') {
            <p class="text-xs text-red-400">Error al registrar. Verifica que el bot token sea correcto y que la URL sea HTTPS.</p>
          }
        } @else {
          <!-- Standard node configuration (systemPrompt + temperature) -->
          <div>
            <label class="text-xs text-gray-400 uppercase tracking-wider block mb-1">
              System Prompt
            </label>
            <textarea
              [value]="currentPrompt()"
              (input)="onPromptChange($event)"
              rows="8"
              class="w-full bg-gray-800 text-white text-sm rounded-lg p-3 border border-gray-600 outline-none focus:border-blue-500 resize-none leading-relaxed"
              placeholder="Instrucciones del sistema para este agente...">
            </textarea>
          </div>

          <div>
            <label class="text-xs text-gray-400 uppercase tracking-wider block mb-1">
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
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>0 (precise)</span>
              <span>2 (creative)</span>
            </div>
          </div>
        }
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

  readonly currentBotToken = computed(() => this.node()?.data.config?.botToken ?? '');
  readonly webhookUrl = computed(() =>
    typeof window !== 'undefined' ? window.location.origin + '/api/telegram' : '/api/telegram'
  );
  readonly registerStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');

  close(): void {
    this.flowService.setSelectedNode(null);
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
