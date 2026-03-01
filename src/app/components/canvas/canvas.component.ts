import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgClass, NgStyle } from '@angular/common';
import { FFlowModule } from '@foblex/flow';
import { FlowService } from '../../services/flow.service';
import type { FMoveNodesEvent } from '@foblex/flow';

const EMOJI_MAP: Record<string, string> = {
  target: '🎯',
  brain: '🧠',
  'check-circle': '✅',
  zap: '⚡',
  'message-circle': '💬',
  tool: '🔧',
};

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [FFlowModule, NgFor, NgClass, NgStyle],
  host: { class: 'block w-full h-full' },
  templateUrl: './canvas.component.html',
})
export class CanvasComponent implements OnInit {
  readonly flowService = inject(FlowService);

  ngOnInit(): void {
    this.flowService.loadDefaultFlow();
  }

  getEmoji(iconName: string): string {
    return EMOJI_MAP[iconName] ?? '📦';
  }

  onMoveNodes(event: FMoveNodesEvent): void {
    for (const moved of event.nodes) {
      this.flowService.updateNodePosition(moved.id, moved.position);
    }
  }
}
