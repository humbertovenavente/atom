import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { FlowNode, FlowEdge, NodeConfig } from '@models/types';

interface FlowResponse {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

@Injectable({ providedIn: 'root' })
export class FlowService {
  private readonly http = inject(HttpClient);

  readonly nodes = signal<FlowNode[]>([]);
  readonly edges = signal<FlowEdge[]>([]);
  readonly activeNodeId = signal<string | null>(null);
  readonly selectedNodeId = signal<string | null>(null);
  readonly completedNodeIds = signal<Set<string>>(new Set());
  readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  loadDefaultFlow(): void {
    this.http.get<FlowResponse>('/api/flow').subscribe({
      next: (response) => {
        this.nodes.set(response.nodes);
        this.edges.set(response.edges);
      },
      error: (err) => {
        console.error('Failed to load default flow:', err);
      },
    });
  }

  addNode(node: FlowNode): void {
    this.nodes.update((nodes) => [...nodes, node]);
  }

  updateNodePosition(id: string, position: { x: number; y: number }): void {
    this.nodes.update((nodes) =>
      nodes.map((node) => (node.id === id ? { ...node, position } : node))
    );
  }

  setActiveNode(id: string | null): void {
    this.activeNodeId.set(id);
  }

  setCompletedNode(id: string): void {
    this.completedNodeIds.update((ids) => new Set([...ids, id]));
  }

  clearCompletedNodes(): void {
    this.completedNodeIds.set(new Set());
  }

  setSelectedNode(id: string | null): void {
    this.selectedNodeId.set(id);
  }

  removeNode(id: string): void {
    this.nodes.update((nodes) => nodes.filter((node) => node.id !== id));
    this.edges.update((edges) =>
      edges.filter((edge) => edge.source !== id && edge.target !== id)
    );
  }

  addEdge(edge: FlowEdge): void {
    this.edges.update((edges) => [...edges, edge]);
  }

  updateNodeConfig(nodeId: string, patch: Partial<NodeConfig>): void {
    this.nodes.update((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config: { ...(n.data.config ?? {}), ...patch } } }
          : n
      )
    );
  }

  async saveFlow(): Promise<void> {
    this.saveStatus.set('saving');
    try {
      await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowId: 'default',
          nodes: this.nodes(),
          edges: this.edges(),
          nodeConfigs: {},
        }),
      });
      this.saveStatus.set('saved');
      setTimeout(() => this.saveStatus.set('idle'), 2000);
    } catch {
      this.saveStatus.set('error');
      setTimeout(() => this.saveStatus.set('idle'), 3000);
    }
  }

  resetFlow(): void {
    this.http.get<FlowResponse>('/api/flow?default=true').subscribe({
      next: (response) => {
        this.nodes.set(response.nodes);
        this.edges.set(response.edges);
      },
      error: (err) => console.error('Failed to reset flow:', err),
    });
    this.setSelectedNode(null);
  }
}
