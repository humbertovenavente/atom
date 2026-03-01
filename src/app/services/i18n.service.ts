import { Injectable, signal, effect } from '@angular/core';

export type Locale = 'en' | 'es';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Sidebar
    'sidebar.nodes': 'Nodes',
    'sidebar.memory': 'Memory',
    'sidebar.memory.desc': 'Stores conversation context',
    'sidebar.orchestrator': 'Orchestrator',
    'sidebar.orchestrator.desc': 'Routes agent flow',
    'sidebar.validator': 'Validator',
    'sidebar.validator.desc': 'Validates collected data',
    'sidebar.specialist': 'Specialist',
    'sidebar.specialist.desc': 'Domain-specific expert',
    'sidebar.generic': 'Generic',
    'sidebar.generic.desc': 'General responses',
    'sidebar.tool': 'Tool',
    'sidebar.tool.desc': 'External tool integration',

    // Chat
    'chat.title': 'Chat',
    'chat.newConversation': 'New Conversation',
    'chat.history': 'History',
    'chat.close': 'Close',
    'chat.noHistory': 'No previous conversations',
    'chat.placeholder': 'Type your message...',
    'chat.send': 'Send',
    'chat.welcome': "Hi! I'm your Volkswagen assistant. How can I help you today?",
    'chat.chip.catalog': 'Browse car catalog',
    'chat.chip.schedule': 'Schedule an appointment',
    'chat.chip.faq': 'Frequently asked questions',
    'chat.chip.financing': 'Financing options',
    'chat.justNow': 'Just now',
    'chat.mAgo': 'm ago',
    'chat.hAgo': 'h ago',
    'chat.dAgo': 'd ago',

    // Toolbar
    'toolbar.save': 'Save',
    'toolbar.saving': 'Saving...',
    'toolbar.saved': 'Saved',
    'toolbar.error': 'Error — Retry',
    'toolbar.resetFlow': 'Reset Flow',
    'toolbar.resetConfirm': 'Reset flow to default?',
    'toolbar.toggleTheme': 'Toggle theme',

    // Node config
    'config.systemPrompt': 'System Prompt',
    'config.promptPlaceholder': 'System instructions for this agent...',
    'config.temperature': 'Temperature',
    'config.precise': '0 (precise)',
    'config.creative': '2 (creative)',
    'config.deleteNode': 'Delete Node',
    'config.deleteConfirm': 'Delete this node?',
  },
  es: {
    // Sidebar
    'sidebar.nodes': 'Nodos',
    'sidebar.memory': 'Memoria',
    'sidebar.memory.desc': 'Almacena contexto de la conversacion',
    'sidebar.orchestrator': 'Orquestador',
    'sidebar.orchestrator.desc': 'Dirige el flujo del agente',
    'sidebar.validator': 'Validador',
    'sidebar.validator.desc': 'Valida los datos recolectados',
    'sidebar.specialist': 'Especialista',
    'sidebar.specialist.desc': 'Experto en un dominio',
    'sidebar.generic': 'Generico',
    'sidebar.generic.desc': 'Respuestas generales',
    'sidebar.tool': 'Herramienta',
    'sidebar.tool.desc': 'Integracion con herramientas externas',

    // Chat
    'chat.title': 'Chat',
    'chat.newConversation': 'Nueva Conversacion',
    'chat.history': 'Historial',
    'chat.close': 'Cerrar',
    'chat.noHistory': 'Sin conversaciones previas',
    'chat.placeholder': 'Escribe tu mensaje...',
    'chat.send': 'Enviar',
    'chat.welcome': 'Hola! Soy tu asistente Volkswagen. Como puedo ayudarte hoy?',
    'chat.chip.catalog': 'Ver catalogo de autos',
    'chat.chip.schedule': 'Agendar una cita',
    'chat.chip.faq': 'Preguntas frecuentes',
    'chat.chip.financing': 'Opciones de financiamiento',
    'chat.justNow': 'Ahora',
    'chat.mAgo': 'min',
    'chat.hAgo': 'h',
    'chat.dAgo': 'd',

    // Toolbar
    'toolbar.save': 'Guardar',
    'toolbar.saving': 'Guardando...',
    'toolbar.saved': 'Guardado',
    'toolbar.error': 'Error — Reintentar',
    'toolbar.resetFlow': 'Resetear Flujo',
    'toolbar.resetConfirm': 'Resetear el flujo al predeterminado?',
    'toolbar.toggleTheme': 'Cambiar tema',

    // Node config
    'config.systemPrompt': 'Prompt del Sistema',
    'config.promptPlaceholder': 'Instrucciones del sistema para este agente...',
    'config.temperature': 'Temperatura',
    'config.precise': '0 (preciso)',
    'config.creative': '2 (creativo)',
    'config.deleteNode': 'Eliminar Nodo',
    'config.deleteConfirm': 'Eliminar este nodo?',
  },
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<Locale>(this.getInitialLocale());

  constructor() {
    effect(() => {
      localStorage.setItem('locale', this.locale());
    });
  }

  t(key: string): string {
    return translations[this.locale()][key] ?? key;
  }

  toggleLocale(): void {
    this.locale.update(l => l === 'en' ? 'es' : 'en');
  }

  private getInitialLocale(): Locale {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('locale');
      if (saved === 'en' || saved === 'es') return saved;
    }
    return 'es'; // Default to Spanish since content is Spanish
  }
}
