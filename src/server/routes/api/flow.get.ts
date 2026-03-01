import { defineEventHandler } from 'h3';
import type { FlowNode, FlowEdge } from '../../../shared/types';

const nodes: FlowNode[] = [
  {
    id: 'orchestrator-1',
    type: 'orchestrator',
    position: { x: 80, y: 300 },
    data: {
      label: 'Orquestador',
      icon: 'target',
      color: '#3B82F6',
    },
  },
  {
    id: 'memory-1',
    type: 'memory',
    position: { x: 320, y: 100 },
    data: {
      label: 'Memoria',
      icon: 'brain',
      color: '#8B5CF6',
    },
  },
  {
    id: 'specialist-faqs',
    type: 'specialist',
    position: { x: 320, y: 260 },
    data: {
      label: 'Especialista FAQs',
      icon: 'zap',
      color: '#F59E0B',
    },
  },
  {
    id: 'specialist-catalog',
    type: 'specialist',
    position: { x: 320, y: 380 },
    data: {
      label: 'Especialista Catálogo',
      icon: 'zap',
      color: '#F59E0B',
    },
  },
  {
    id: 'specialist-schedule',
    type: 'specialist',
    position: { x: 320, y: 500 },
    data: {
      label: 'Especialista Agenda',
      icon: 'zap',
      color: '#F59E0B',
    },
  },
  {
    id: 'tool-search',
    type: 'tool',
    position: { x: 560, y: 100 },
    data: {
      label: 'Herramienta Búsqueda',
      icon: 'tool',
      color: '#EF4444',
    },
  },
  {
    id: 'validator-1',
    type: 'validator',
    position: { x: 560, y: 320 },
    data: {
      label: 'Validador',
      icon: 'check-circle',
      color: '#10B981',
    },
  },
  {
    id: 'generic-1',
    type: 'generic',
    position: { x: 800, y: 300 },
    data: {
      label: 'Genérico',
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

export default defineEventHandler(() => {
  return { nodes, edges };
});
