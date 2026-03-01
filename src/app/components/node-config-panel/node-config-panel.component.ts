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
        <!-- System Prompt -->
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

        <!-- Temperature -->
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider block mb-1">
            Temperatura: {{ currentTemp() }}
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
            <span>0 (preciso)</span>
            <span>2 (creativo)</span>
          </div>
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

  readonly currentTemp = computed(() => this.node()?.data.config?.temperature ?? 0.7);

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
}
