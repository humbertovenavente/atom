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
import type { ChatMessage } from '@models/types';

const AGENT_BADGE_MAP: Record<string, { label: string; color: string }> = {
  memory: { label: 'Memoria', color: '#8B5CF6' },
  orchestrator: { label: 'Orquestador', color: '#3B82F6' },
  validator: { label: 'Validador', color: '#10B981' },
  specialist: { label: 'Especialista', color: '#F59E0B' },
  generic: { label: 'Genérico', color: '#6B7280' },
};

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, NgClass],
  host: { class: 'flex flex-col h-full' },
  template: `
    <div class="flex flex-col h-full bg-gray-900 text-white border-l border-gray-700">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-700 flex-shrink-0">
        <h2 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Chat Playground</h2>
      </div>

      <!-- Messages area -->
      <div #messagesContainer class="flex-1 overflow-y-auto p-4 space-y-3" (scroll)="onScroll($event)">

        <!-- Empty state: welcome + chips -->
        @if (chat.messages().length === 0 && !chat.isStreaming()) {
          <div class="flex flex-col items-center gap-6 py-8">
            <p class="text-gray-400 text-sm text-center max-w-xs">
              ¡Hola! Soy tu asistente de Volkswagen. ¿En qué te puedo ayudar hoy?
            </p>
            <div class="flex flex-col gap-2 w-full max-w-xs">
              @for (chip of suggestionChips; track chip) {
                <button
                  (click)="fillInput(chip)"
                  class="text-left text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-2 border border-gray-600 transition-colors">
                  {{ chip }}
                </button>
              }
            </div>
          </div>
        }

        <!-- Message bubbles -->
        @for (message of chat.messages(); track $index) {
          <div class="flex" [class.justify-end]="message.role === 'user'">
            <div class="max-w-[80%] rounded-lg px-3 py-2"
              [ngClass]="message.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-800 text-gray-100 rounded-bl-sm'">

              <!-- Agent badge for assistant messages -->
              @if (message.role === 'assistant' && getAgentBadge(message.agentType)) {
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="w-2 h-2 rounded-full inline-block"
                    [style.backgroundColor]="getAgentBadge(message.agentType)!.color"></span>
                  <span class="text-xs font-medium" [style.color]="getAgentBadge(message.agentType)!.color">
                    {{ getAgentBadge(message.agentType)!.label }}
                  </span>
                </div>
              }

              <!-- Message content -->
              @if (message.role === 'assistant' && message.content) {
                <div class="chat-markdown text-sm" [innerHTML]="renderMarkdown(message.content)"></div>
              } @else if (message.role === 'assistant' && !message.content && chat.isStreaming() && isLastMessage(message)) {
                <!-- Typing indicator (dots) shown when streaming and content is still empty -->
                <div class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              } @else {
                <p class="text-sm whitespace-pre-wrap">{{ message.content }}</p>
              }

              <!-- Blinking cursor at end of streaming assistant message -->
              @if (message.role === 'assistant' && message.content && chat.isStreaming() && isLastMessage(message)) {
                <span class="streaming-cursor">█</span>
              }
            </div>
          </div>
        }
      </div>

      <!-- Input bar -->
      <div class="flex-shrink-0 border-t border-gray-700 p-3 flex gap-2">
        <input
          type="text"
          [(ngModel)]="inputText"
          (keydown)="onKeydown($event)"
          [disabled]="chat.isStreaming()"
          placeholder="Escribe tu mensaje..."
          class="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 outline-none focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          (click)="send()"
          [disabled]="chat.isStreaming() || !inputText.trim()"
          class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
          Enviar
        </button>
      </div>
    </div>
  `,
})
export class ChatComponent {
  readonly chat = inject(ChatService);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  inputText = '';
  userScrolledUp = false;

  readonly suggestionChips = [
    'Ver catálogo de autos',
    'Agendar una cita',
    'Preguntas frecuentes',
    'Opciones de financiamiento',
  ];

  constructor() {
    // Auto-scroll to bottom when messages change (unless user scrolled up)
    effect(() => {
      this.chat.messages();
      if (!this.userScrolledUp) {
        setTimeout(() => this.scrollToBottom(), 0);
      }
    });

    // Session restore — runs after first render (browser-safe)
    afterNextRender(() => {
      const savedId = localStorage.getItem('chat_session_id');
      if (savedId) {
        this.chat.loadSession(savedId).catch(() => localStorage.removeItem('chat_session_id'));
      }
    });
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
}
