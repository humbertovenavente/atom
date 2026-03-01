import { Component, inject } from '@angular/core';
import { FlowService } from '../../services/flow.service';
import { NodeConfigPanelComponent } from '../node-config-panel/node-config-panel.component';

interface NodeTypeConfig {
  type: 'memory' | 'orchestrator' | 'validator' | 'specialist' | 'generic' | 'tool';
  label: string;
  icon: string;
  color: string;
  description: string;
}

const NODE_TYPE_CONFIGS: NodeTypeConfig[] = [
  { type: 'memory', label: 'Memory', icon: 'brain', color: '#8B5CF6', description: 'Stores conversation context' },
  { type: 'orchestrator', label: 'Orchestrator', icon: 'target', color: '#3B82F6', description: 'Routes agent flow' },
  { type: 'validator', label: 'Validator', icon: 'check-circle', color: '#10B981', description: 'Validates collected data' },
  { type: 'specialist', label: 'Specialist', icon: 'zap', color: '#F59E0B', description: 'Domain-specific expert' },
  { type: 'generic', label: 'Generic', icon: 'message-circle', color: '#6B7280', description: 'General responses' },
  { type: 'tool', label: 'Tool', icon: 'tool', color: '#EF4444', description: 'External tool integration' },
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
  imports: [NodeConfigPanelComponent],
  host: { class: 'block h-full overflow-hidden' },
  template: `
    @if (flowService.selectedNodeId()) {
      <app-node-config-panel [nodeId]="flowService.selectedNodeId()!" />
    } @else {
      <div class="h-full bg-gray-900 text-white border-r border-gray-700/50 flex flex-col">
        <div class="px-4 py-3 border-b border-gray-700/50">
          <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-widest">Nodes</h2>
        </div>
        <div class="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          @for (config of nodeTypes; track config.type) {
            <div
              draggable="true"
              (dragstart)="onDragStart($event, config.type)"
              class="rounded-lg p-2.5 cursor-grab hover:bg-gray-800/70 transition-all duration-150 select-none border border-transparent hover:border-gray-700/50"
              [style.borderLeft]="'3px solid ' + config.color + ' !important'">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-base">{{ getEmoji(config.icon) }}</span>
                <span class="text-sm font-medium text-gray-100">{{ config.label }}</span>
              </div>
              <p class="text-xs text-gray-500 leading-snug pl-7">{{ config.description }}</p>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class SidebarComponent {
  readonly flowService = inject(FlowService);
  readonly nodeTypes = NODE_TYPE_CONFIGS;

  getEmoji(iconName: string): string {
    return EMOJI_MAP[iconName] ?? '📦';
  }

  onDragStart(event: DragEvent, nodeType: string): void {
    event.dataTransfer?.setData('application/node-type', nodeType);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }
}
