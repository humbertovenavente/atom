import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
  effect,
  afterNextRender,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { ChatService } from '../../services/chat.service';
import { FlowService } from '../../services/flow.service';
import type { ChatMessage } from '@models/types';

const AGENT_BADGE_MAP: Record<string, { label: string; color: string }> = {
  memory: { label: 'Memory', color: '#8B5CF6' },
  orchestrator: { label: 'Orchestrator', color: '#3B82F6' },
  validator: { label: 'Validator', color: '#10B981' },
  specialist: { label: 'Specialist', color: '#F59E0B' },
  generic: { label: 'Generic', color: '#6B7280' },
};

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, NgClass],
  host: { class: 'flex flex-col h-full min-h-0 overflow-hidden' },
  template: `
    <div class="flex flex-col h-full border-l" style="background: var(--bg-secondary); color: var(--text-primary); border-color: var(--border-primary);">
      <!-- Header -->
      <div class="px-4 py-3 border-b flex-shrink-0 flex items-center justify-between" style="border-color: var(--border-primary);">
        <div class="flex items-center gap-2">
          <h2 class="text-xs font-semibold uppercase tracking-widest" style="color: var(--text-secondary);">Chat</h2>
          <button (click)="toggleHistory()"
            class="transition-colors"
            style="color: var(--text-tertiary);"
            [class.text-blue-400]="showHistory()"
            title="Conversation history">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
        </div>
        <button (click)="newConversation()"
          class="text-xs px-2.5 py-1 rounded-md transition-all duration-150"
          style="border: 1px solid var(--border-primary); color: var(--text-secondary);">
          New Conversation
        </button>
      </div>

      <!-- History panel (overlay) -->
      @if (showHistory()) {
        <div class="flex-1 min-h-0 overflow-y-auto">
          <div class="p-3 space-y-1">
            <div class="flex items-center justify-between mb-2 px-1">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">History</span>
              <button (click)="toggleHistory()" class="text-xs text-gray-500 hover:text-gray-300 transition-colors">Close</button>
            </div>
            @if (chat.sessionHistory().length === 0) {
              <p class="text-xs text-gray-500 text-center py-6">No previous conversations</p>
            }
            @for (session of chat.sessionHistory(); track session.sessionId) {
              <div class="group relative">
                @if (editingSessionId() === session.sessionId) {
                  <div class="flex items-center gap-1.5 rounded-lg px-3 py-2.5" style="background: var(--bg-tertiary); border: 1px solid var(--border-primary);">
                    <input
                      type="text"
                      [(ngModel)]="editingTitle"
                      (keydown.enter)="confirmRename(session.sessionId)"
                      (keydown.escape)="cancelRename()"
                      class="flex-1 bg-transparent text-sm outline-none min-w-0" style="color: var(--text-primary);"
                      autofocus
                    />
                    <button (click)="confirmRename(session.sessionId)" class="text-green-400 hover:text-green-300 shrink-0 p-0.5" title="Save">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <button (click)="cancelRename()" class="text-gray-400 hover:text-gray-300 shrink-0 p-0.5" title="Cancel">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                } @else {
                  <button
                    (click)="loadSession(session.sessionId)"
                    class="w-full text-left rounded-lg px-3 py-2.5 pr-16 transition-all duration-150 border border-transparent"
                    [class]="session.sessionId === chat.sessionId()
                      ? 'bg-blue-600/15 border-blue-500/30 text-blue-300'
                      : 'theme-hover'"
                    [style]="session.sessionId !== chat.sessionId() ? 'color: var(--text-secondary)' : ''">
                    <p class="text-sm truncate">{{ session.title || session.preview }}</p>
                    <p class="text-[10px] mt-0.5" style="color: var(--text-tertiary);">{{ formatDate(session.updatedAt) }}</p>
                  </button>
                  <!-- Action buttons -->
                  <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button (click)="startRename(session); $event.stopPropagation()"
                      class="p-1.5 rounded-md transition-colors theme-hover"
                    style="color: var(--text-tertiary);"
                      title="Rename">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button (click)="deleteSession(session.sessionId); $event.stopPropagation()"
                      class="p-1.5 rounded-md hover:text-red-400 transition-colors theme-hover"
                      style="color: var(--text-tertiary);"
                      title="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Messages area -->
      @if (!showHistory()) {
        <div #messagesContainer class="flex-1 min-h-0 overflow-y-auto p-4 space-y-3" (scroll)="onScroll($event)">

          <!-- Empty state: welcome + chips -->
          @if (chat.messages().length === 0 && !chat.isStreaming()) {
            <div class="flex flex-col items-center gap-5 py-10">
              <p class="text-sm text-center max-w-[260px] leading-relaxed" style="color: var(--text-secondary);">
                Hi! I'm your Volkswagen assistant. How can I help you today?
              </p>
              <div class="flex flex-col gap-2 w-full max-w-[260px]">
                @for (chip of suggestionChips; track chip) {
                  <button
                    (click)="fillInput(chip)"
                    class="text-left text-sm rounded-lg px-3 py-2.5 transition-all duration-150 theme-hover"
                    style="color: var(--text-secondary); border: 1px solid var(--border-primary);">
                    {{ chip }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- Message bubbles -->
          @for (message of chat.messages(); track $index) {
            <div class="flex" [class.justify-end]="message.role === 'user'">
              <div class="max-w-[85%] rounded-xl px-3.5 py-2.5"
                [ngClass]="message.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'rounded-bl-sm'"
                [style]="message.role !== 'user' ? 'background: var(--bg-tertiary); color: var(--text-primary);' : ''">

                <!-- Agent badge for assistant messages -->
                @if (message.role === 'assistant' && getAgentBadge(message.agentType)) {
                  <div class="flex items-center gap-1.5 mb-1.5">
                    <span class="w-1.5 h-1.5 rounded-full inline-block"
                      [style.backgroundColor]="getAgentBadge(message.agentType)!.color"></span>
                    <span class="text-[10px] font-semibold uppercase tracking-wider" [style.color]="getAgentBadge(message.agentType)!.color">
                      {{ getAgentBadge(message.agentType)!.label }}
                    </span>
                  </div>
                }

                <!-- Message content -->
                @if (message.role === 'assistant' && message.content) {
                  <div class="chat-markdown text-sm leading-relaxed" [innerHTML]="renderMarkdown(message.content)"></div>
                } @else if (message.role === 'assistant' && !message.content && chat.isStreaming() && isLastMessage(message)) {
                  <div class="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                } @else {
                  <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ message.content }}</p>
                }

                <!-- Blinking cursor at end of streaming assistant message -->
                @if (message.role === 'assistant' && message.content && chat.isStreaming() && isLastMessage(message)) {
                  <span class="streaming-cursor">█</span>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Input bar -->
      @if (!showHistory()) {
        <div class="flex-shrink-0 border-t p-3 flex gap-2" style="border-color: var(--border-primary);">
          <input
            type="text"
            [(ngModel)]="inputText"
            (keydown)="onKeydown($event)"
            [disabled]="chat.isStreaming()"
            placeholder="Type your message..."
            class="flex-1 text-sm rounded-lg px-3.5 py-2.5 outline-none focus:ring-1 focus:ring-blue-500/20 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style="background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-primary);"
          />
          <button
            (click)="send()"
            [disabled]="chat.isStreaming() || !inputText.trim()"
            class="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all duration-150 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
            Send
          </button>
        </div>
      }
    </div>
  `,
})
export class ChatComponent {
  readonly chat = inject(ChatService);
  private readonly flowService = inject(FlowService);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  inputText = '';
  userScrolledUp = false;
  readonly showHistory = signal(false);
  readonly editingSessionId = signal<string | null>(null);
  editingTitle = '';

  readonly suggestionChips = [
    'Browse car catalog',
    'Schedule an appointment',
    'Frequently asked questions',
    'Financing options',
  ];

  constructor() {
    effect(() => {
      this.chat.messages();
      if (!this.userScrolledUp) {
        setTimeout(() => this.scrollToBottom(), 0);
      }
    });

    afterNextRender(() => {
      const savedId = localStorage.getItem('chat_session_id');
      if (savedId) {
        this.chat.loadSession(savedId).catch(() => localStorage.removeItem('chat_session_id'));
      }
    });
  }

  toggleHistory(): void {
    const next = !this.showHistory();
    this.showHistory.set(next);
    if (next) {
      this.chat.fetchSessionHistory();
    }
  }

  async loadSession(sessionId: string): Promise<void> {
    await this.chat.switchToSession(sessionId);
    this.flowService.setActiveNode(null);
    this.flowService.clearCompletedNodes();
    this.showHistory.set(false);
    this.userScrolledUp = false;
    setTimeout(() => this.scrollToBottom(), 0);
  }

  newConversation(): void {
    this.chat.startNewSession();
    this.flowService.setActiveNode(null);
    this.flowService.clearCompletedNodes();
    this.showHistory.set(false);
  }

  send(): void {
    if (!this.inputText.trim() || this.chat.isStreaming()) {
      return;
    }
    this.chat.sendMessage(this.inputText.trim());
    this.inputText = '';
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  fillInput(chip: string): void {
    this.inputText = chip;
    this.send();
  }

  renderMarkdown(content: string): SafeHtml {
    const html = marked.parse(content) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    this.userScrolledUp = !atBottom;
  }

  scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  isLastMessage(msg: ChatMessage): boolean {
    const msgs = this.chat.messages();
    return msgs[msgs.length - 1] === msg;
  }

  getAgentBadge(agentType?: string): { label: string; color: string } | null {
    if (!agentType) return null;
    return AGENT_BADGE_MAP[agentType] ?? null;
  }

  startRename(session: { sessionId: string; title?: string | null; preview: string }): void {
    this.editingSessionId.set(session.sessionId);
    this.editingTitle = session.title || session.preview;
  }

  cancelRename(): void {
    this.editingSessionId.set(null);
    this.editingTitle = '';
  }

  async confirmRename(sessionId: string): Promise<void> {
    const title = this.editingTitle.trim();
    if (title) {
      await this.chat.renameSession(sessionId, title);
    }
    this.editingSessionId.set(null);
    this.editingTitle = '';
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.chat.deleteSession(sessionId);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
