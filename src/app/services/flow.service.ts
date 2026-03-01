import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { FlowNode, FlowEdge } from '@models/types';

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
}
