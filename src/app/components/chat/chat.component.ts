import { Component } from '@angular/core';

@Component({
  selector: 'app-chat',
  standalone: true,
  host: { class: 'flex flex-col h-full' },
  template: `
    <div class="flex flex-col h-full bg-gray-900 text-white border-l border-gray-700">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-700 flex-shrink-0">
        <h2 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Chat Playground</h2>
      </div>

      <!-- Messages area -->
      <div class="flex-1 overflow-y-auto p-4 flex items-center justify-center">
        <p class="text-gray-500 text-sm text-center">Envía un mensaje para comenzar...</p>
      </div>

      <!-- Input bar -->
      <div class="flex-shrink-0 border-t border-gray-700 p-3 flex gap-2">
        <input
          type="text"
          placeholder="Escribe tu mensaje..."
          class="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 outline-none focus:border-blue-500 transition-colors"
        />
        <button
          class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0">
          Enviar
        </button>
      </div>
    </div>
  `,
})
export class ChatComponent {}
