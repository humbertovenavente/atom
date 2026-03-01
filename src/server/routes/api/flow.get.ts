import { defineEventHandler, getQuery } from 'h3';
import { connectDB } from '../../db/connect';
import { Flow } from '../../models/flow';
import type { FlowNode, FlowEdge } from '../../../shared/types';

const nodes: FlowNode[] = [
  {
    id: 'orchestrator-1',
    type: 'orchestrator',
    position: { x: 80, y: 300 },
    data: {
      label: 'Orchestrator',
      icon: 'target',
      color: '#3B82F6',
    },
  },
  {
    id: 'memory-1',
    type: 'memory',
    position: { x: 320, y: 100 },
    data: {
      label: 'Memory',
      icon: 'brain',
      color: '#8B5CF6',
    },
  },
  {
    id: 'specialist-faqs',
    type: 'specialist',
    position: { x: 320, y: 260 },
    data: {
      label: 'FAQ Specialist',
      icon: 'zap',
      color: '#F59E0B',
    },
  },
  {
    id: 'specialist-catalog',
    type: 'specialist',
    position: { x: 320, y: 380 },
    data: {
      label: 'Catalog Specialist',
      icon: 'zap',
      color: '#F59E0B',
    },
  },
  {
    id: 'specialist-schedule',
    type: 'specialist',
    position: { x: 320, y: 500 },
    data: {
      label: 'Schedule Specialist',
      icon: 'zap',
      color: '#F59E0B',
    },
  },
  {
    id: 'tool-search',
    type: 'tool',
    position: { x: 560, y: 100 },
    data: {
      label: 'Search Tool',
      icon: 'tool',
      color: '#EF4444',
    },
  },
  {
    id: 'validator-1',
    type: 'validator',
    position: { x: 560, y: 320 },
    data: {
      label: 'Validator',
      icon: 'check-circle',
      color: '#10B981',
    },
  },
  {
    id: 'generic-1',
    type: 'generic',
    position: { x: 800, y: 300 },
    data: {
      label: 'Generic',
      icon: 'message-circle',
      color: '#6B7280',
    },
  },
];

const edges: FlowEdge[] = [
  {
    id: 'edge-orchestrator-memory',
    source: 'orchestrator-1',
    target: 'memory-1',
    animated: true,
  },
  {
    id: 'edge-orchestrator-faqs',
    source: 'orchestrator-1',
    target: 'specialist-faqs',
    animated: false,
  },
  {
    id: 'edge-orchestrator-catalog',
    source: 'orchestrator-1',
    target: 'specialist-catalog',
    animated: false,
  },
  {
    id: 'edge-orchestrator-schedule',
    source: 'orchestrator-1',
    target: 'specialist-schedule',
    animated: false,
  },
  {
    id: 'edge-faqs-validator',
    source: 'specialist-faqs',
    target: 'validator-1',
    animated: false,
  },
  {
    id: 'edge-catalog-validator',
    source: 'specialist-catalog',
    target: 'validator-1',
    animated: false,
  },
  {
    id: 'edge-schedule-validator',
    source: 'specialist-schedule',
    target: 'validator-1',
    animated: false,
  },
  {
    id: 'edge-validator-generic',
    source: 'validator-1',
    target: 'generic-1',
    animated: false,
  },
];

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  // Skip MongoDB lookup when reset is requested
  if (query['default'] !== 'true') {
    try {
      await connectDB();
      const saved = await Flow.findOne({ flowId: 'default' }).lean();
      if (saved) {
        // Normalize: reset temperature from old 0.7 default to 0.3
        const normalizedNodes = (saved.nodes as any[]).map((n: any) => {
          if (n.data?.config?.temperature === 0.7) {
            return { ...n, data: { ...n.data, config: { ...n.data.config, temperature: 0.3 } } };
          }
          return n;
        });
        return {
          nodes: normalizedNodes,
          edges: saved.edges,
          nodeConfigs: saved.nodeConfigs ?? {},
        };
      }
    } catch {
      // DB unavailable — fall through to hardcoded default
    }
  }

  return { nodes, edges };
});
