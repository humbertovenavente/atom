import { Component, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { FFlowModule, FZoomDirective, FCanvasComponent } from '@foblex/flow';
import { FlowService } from '../../services/flow.service';
import type { FCreateConnectionEvent, FMoveNodesEvent, FSelectionChangeEvent } from '@foblex/flow';
import type { FlowNode, FlowEdge } from '@models/types';

const EMOJI_MAP: Record<string, string> = {
  target: '🎯',
  brain: '🧠',
  'check-circle': '✅',
  zap: '⚡',
  'message-circle': '💬',
  tool: '🔧',
};

const NODE_TYPE_CONFIGS = [
  { type: 'memory', label: 'Memory', icon: 'brain', color: '#8B5CF6' },
  { type: 'orchestrator', label: 'Orchestrator', icon: 'target', color: '#3B82F6' },
  { type: 'validator', label: 'Validator', icon: 'check-circle', color: '#10B981' },
  { type: 'specialist', label: 'Specialist', icon: 'zap', color: '#F59E0B' },
  { type: 'generic', label: 'Generic', icon: 'message-circle', color: '#6B7280' },
  { type: 'tool', label: 'Tool', icon: 'tool', color: '#EF4444' },
] as const;

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [FFlowModule, NgFor],
  host: {
    class: 'block w-full h-full relative overflow-hidden',
    style: 'background: var(--canvas-bg);',
  },
  templateUrl: './canvas.component.html',
})
export class CanvasComponent implements OnInit {
  readonly flowService = inject(FlowService);

  @ViewChild(FZoomDirective) fZoom!: FZoomDirective;
  @ViewChild(FCanvasComponent) fCanvas!: FCanvasComponent;

  private _isDragging = false;
  private _selectedEdgeIds: string[] = [];

  ngOnInit(): void {
    this.flowService.loadDefaultFlow();
  }

  getEmoji(iconName: string): string {
    return EMOJI_MAP[iconName] ?? '📦';
  }

  onMoveNodes(event: FMoveNodesEvent): void {
    this._isDragging = true;
    for (const moved of event.nodes) {
      this.flowService.updateNodePosition(moved.id, moved.position);
    }
    setTimeout(() => (this._isDragging = false), 0);
  }

  onNodeClick(nodeId: string): void {
    if (!this._isDragging) {
      this.flowService.setSelectedNode(nodeId);
    }
  }

  onSelectionChange(event: FSelectionChangeEvent): void {
    this._selectedEdgeIds = event.fConnectionIds ?? [];
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    // Delete selected edges
    if (this._selectedEdgeIds.length > 0) {
      event.preventDefault();
      for (const edgeId of this._selectedEdgeIds) {
        this.flowService.removeEdge(edgeId);
      }
      this._selectedEdgeIds = [];
      return;
    }

    // Delete selected node
    if (this.flowService.selectedNodeId()) {
      event.preventDefault();
      this.flowService.setSelectedNode(null);
      this.flowService.removeNode(this.flowService.selectedNodeId()!);
    }
  }

  onCreateConnection(event: FCreateConnectionEvent): void {
    if (!event.targetId) return;
    // sourceId = "nodeId-out", targetId = "nodeId-in"
    const source = event.sourceId.replace(/-out$/, '');
    const target = event.targetId.replace(/-in$/, '');
    if (source === target) return;
    // Prevent duplicate edges
    const exists = this.flowService.edges().some(
      (e) => e.source === source && e.target === target
    );
    if (exists) return;
    const newEdge: FlowEdge = {
      id: `edge-${source}-${target}`,
      source,
      target,
      animated: false,
    };
    this.flowService.addEdge(newEdge);
  }

  onNodeSizeChange(nodeId: string, event: any): void {
    if (event?.width && event?.height) {
      this.flowService.updateNodeSize(nodeId, { width: event.width, height: event.height });
    }
  }

  zoomIn(): void {
    this.fZoom?.zoomIn();
  }

  zoomOut(): void {
    this.fZoom?.zoomOut();
  }

  fitView(): void {
    this.fCanvas?.fitToScreen(undefined, true);
  }

  onCanvasDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onCanvasDrop(event: DragEvent): void {
    event.preventDefault();
    const nodeType = event.dataTransfer?.getData('application/node-type');
    if (!nodeType) return;

    // Get canvas element bounds to compute relative position
    const canvasEl = event.currentTarget as HTMLElement;
    const rect = canvasEl.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    const config = NODE_TYPE_CONFIGS.find(c => c.type === nodeType);
    if (!config) return;

    const newNode: FlowNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType as FlowNode['type'],
      position,
      data: {
        label: config.label,
        icon: config.icon,
        color: config.color,
      },
    };
    this.flowService.addNode(newNode);
  }
}
