import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

interface NodeTypeConfig {
  type: 'memory' | 'orchestrator' | 'validator' | 'specialist' | 'generic' | 'tool';
  label: string;
  icon: string;
  color: string;
  description: string;
}

const NODE_TYPE_CONFIGS: NodeTypeConfig[] = [
  { type: 'memory', label: 'Memoria', icon: 'brain', color: '#8B5CF6', description: 'Almacena contexto de conversación' },
  { type: 'orchestrator', label: 'Orquestador', icon: 'target', color: '#3B82F6', description: 'Dirige el flujo de agentes' },
  { type: 'validator', label: 'Validador', icon: 'check-circle', color: '#10B981', description: 'Valida datos recolectados' },
  { type: 'specialist', label: 'Especialista', icon: 'zap', color: '#F59E0B', description: 'Experto en dominio específico' },
  { type: 'generic', label: 'Genérico', icon: 'message-circle', color: '#6B7280', description: 'Respuestas generales' },
  { type: 'tool', label: 'Herramienta', icon: 'tool', color: '#EF4444', description: 'Herramienta externa' },
];

const EMOJI_MAP: Record<string, string> = {
  target: '🎯',
  brain: '🧠',
  'check-circle': '✅',
  zap: '⚡',
  'message-circle': '💬',
  tool: '🔧',
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgFor],
  host: { class: 'block h-full overflow-y-auto' },
  template: `
    <div class="h-full bg-gray-900 text-white border-r border-gray-700 flex flex-col">
      <div class="px-4 py-3 border-b border-gray-700">
        <h2 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Nodos</h2>
      </div>
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        <div
          *ngFor="let config of nodeTypes"
          draggable="true"
          class="rounded-lg p-3 cursor-grab hover:bg-gray-800 transition-colors select-none"
          [style.borderLeft]="'3px solid ' + config.color">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-lg">{{ getEmoji(config.icon) }}</span>
            <span class="text-sm font-medium text-white">{{ config.label }}</span>
          </div>
          <p class="text-xs text-gray-400 leading-tight">{{ config.description }}</p>
        </div>
      </div>
    </div>
  `,
})
export class SidebarComponent {
  readonly nodeTypes = NODE_TYPE_CONFIGS;

  getEmoji(iconName: string): string {
    return EMOJI_MAP[iconName] ?? '📦';
  }
}
