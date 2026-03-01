import { Component, inject } from '@angular/core';
import { FlowService } from '../../services/flow.service';
import { NodeConfigPanelComponent } from '../node-config-panel/node-config-panel.component';
import { I18nService } from '../../services/i18n.service';

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
      <div class="h-full flex flex-col border-r"
        style="background: var(--bg-secondary); color: var(--text-primary); border-color: var(--border-primary);">
        <div class="px-4 py-3 border-b" style="border-color: var(--border-primary);">
          <h2 class="text-xs font-semibold uppercase tracking-widest" style="color: var(--text-secondary);">{{ i18n.t('sidebar.nodes') }}</h2>
        </div>
        <div class="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          @for (config of nodeTypes; track config.type) {
            <div
              draggable="true"
              (dragstart)="onDragStart($event, config.type)"
              class="theme-hover rounded-lg p-2.5 cursor-grab transition-all duration-150 select-none border border-transparent"
              [style.borderLeft]="'3px solid ' + config.color + ' !important'">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-base">{{ getEmoji(config.icon) }}</span>
                <span class="text-sm font-medium" style="color: var(--text-primary);">{{ getLabel(config) }}</span>
              </div>
              <p class="text-xs leading-snug pl-7" style="color: var(--text-tertiary);">{{ getDescription(config) }}</p>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class SidebarComponent {
  readonly flowService = inject(FlowService);
  readonly i18n = inject(I18nService);
  readonly nodeTypes = NODE_TYPE_CONFIGS;

  getEmoji(iconName: string): string {
    return EMOJI_MAP[iconName] ?? '📦';
  }

  getLabel(config: NodeTypeConfig): string {
    const key = `sidebar.${config.type}`;
    return this.i18n.t(key);
  }

  getDescription(config: NodeTypeConfig): string {
    const key = `sidebar.${config.type}.desc`;
    return this.i18n.t(key);
  }

  onDragStart(event: DragEvent, nodeType: string): void {
    event.dataTransfer?.setData('application/node-type', nodeType);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }
}
