import { Injectable, inject, signal } from '@angular/core';
import { createParser } from 'eventsource-parser';
import { FlowService } from './flow.service';
import type {
  ChatMessage,
  AgentActiveEvent,
  MessageChunkEvent,
} from '@models/types';

const AGENT_NODE_MAP: Record<string, string> = {
  memory: 'memory-1',
  orchestrator: 'orchestrator-1',
  validator: 'validator-1',
  'specialist-faqs': 'specialist-faqs',
  'specialist-catalog': 'specialist-catalog',
  'specialist-schedule': 'specialist-schedule',
  generic: 'generic-1',
};

export interface SessionSummary {
  sessionId: string;
  title: string | null;
  preview: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly flowService = inject(FlowService);

  readonly messages = signal<ChatMessage[]>([]);
  readonly isStreaming = signal(false);
  readonly sessionId = signal<string | null>(null);
  readonly sessionHistory = signal<SessionSummary[]>([]);

  async sendMessage(userText: string): Promise<void> {
    // Guard: prevent double-send while streaming
    if (this.isStreaming()) {
      return;
    }

    // Add user message
    this.messages.update((msgs) => [
      ...msgs,
      { role: 'user', content: userText, timestamp: new Date() },
    ]);

    this.isStreaming.set(true);

    try {
      // Auto-create session if needed
      if (this.sessionId() === null) {
        const sessionRes = await fetch('/api/sessions', { method: 'POST' });
        const sessionData = await sessionRes.json();
        const newSessionId: string = sessionData.sessionId ?? sessionData._id ?? sessionData.id;
        this.sessionId.set(newSessionId);
        localStorage.setItem('chat_session_id', newSessionId);
      }

      // Add empty placeholder assistant message
      this.messages.update((msgs) => [
        ...msgs,
        { role: 'assistant', content: '', timestamp: new Date(), agentType: undefined },
      ]);

      // POST to /api/chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId(), message: userText }),
      });

      if (!response.body) {
        throw new Error('No response body for SSE stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // eventsource-parser v3: createParser({onEvent}) object syntax
      const parser = createParser({
        onEvent: (event) => this.handleSSEEvent(event),
      });

      // Read loop
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      console.error('ChatService sendMessage error:', error);
      // Show error in last assistant message
      this.messages.update((msgs) => {
        const last = msgs[msgs.length - 1];
        if (last?.role === 'assistant' && last.content === '') {
          return [
            ...msgs.slice(0, -1),
            { ...last, content: 'Error processing your message' },
          ];
        }
        return msgs;
      });
    } finally {
      this.isStreaming.set(false);
      this.flowService.setActiveNode(null);
      this.flowService.clearCompletedNodes();
    }
  }

  private handleSSEEvent(event: { event?: string; data: string }): void {
    let parsed: any;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (event.event) {
      case 'agent_active': {
        const data = parsed as AgentActiveEvent;
        const nodeId = AGENT_NODE_MAP[data.node];
        if (!nodeId) return;
        if (data.status === 'processing') {
          this.flowService.setActiveNode(nodeId);
        } else if (data.status === 'complete') {
          this.flowService.setCompletedNode(nodeId);
          this.flowService.setActiveNode(null);
        }
        break;
      }
      case 'message_chunk': {
        const data = parsed as MessageChunkEvent;
        this.messages.update((msgs) => {
          const lastIndex = msgs.length - 1;
          if (lastIndex >= 0 && msgs[lastIndex].role === 'assistant') {
            const updated = { ...msgs[lastIndex], content: msgs[lastIndex].content + data.content };
            return [...msgs.slice(0, lastIndex), updated];
          }
          return msgs;
        });
        break;
      }
      case 'done':
        // No-op: stream will end naturally via reader.read() done
        break;
      case 'error': {
        this.messages.update((msgs) => {
          const lastIndex = msgs.length - 1;
          if (lastIndex >= 0 && msgs[lastIndex].role === 'assistant' && msgs[lastIndex].content === '') {
            const updated = {
              ...msgs[lastIndex],
              content: parsed.message ?? 'Error processing your message',
            };
            return [...msgs.slice(0, lastIndex), updated];
          }
          return msgs;
        });
        break;
      }
    }
  }

  async loadSession(sessionId: string): Promise<void> {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (!res.ok) {
      localStorage.removeItem('chat_session_id');
      return;
    }
    const data = await res.json();
    this.sessionId.set(sessionId);
    const rawMessages: any[] = data.conversation?.messages ?? data.messages ?? [];
    this.messages.set(
      rawMessages.map((m: any) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        agentType: m.agentType,
      }))
    );
  }

  startNewSession(): void {
    this.messages.set([]);
    this.sessionId.set(null);
    localStorage.removeItem('chat_session_id');
  }

  async fetchSessionHistory(): Promise<void> {
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) return;
      const data: SessionSummary[] = await res.json();
      this.sessionHistory.set(data);
    } catch {
      // Silently fail — history is non-critical
    }
  }

  async switchToSession(sessionId: string): Promise<void> {
    await this.loadSession(sessionId);
    localStorage.setItem('chat_session_id', sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    this.sessionHistory.update((list) => list.filter((s) => s.sessionId !== sessionId));
    // If we just deleted the active session, reset
    if (this.sessionId() === sessionId) {
      this.startNewSession();
    }
  }

  async renameSession(sessionId: string, title: string): Promise<void> {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    this.sessionHistory.update((list) =>
      list.map((s) => (s.sessionId === sessionId ? { ...s, title } : s))
    );
  }
}
