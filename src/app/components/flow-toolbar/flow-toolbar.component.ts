import { Component, inject } from '@angular/core';
import { FlowService } from '../../services/flow.service';

@Component({
  selector: 'app-flow-toolbar',
  standalone: true,
  imports: [],
  template: `
    <div class="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center gap-3">
      <button (click)="save()"
        [disabled]="flowService.saveStatus() === 'saving'"
        class="text-sm border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
        @switch (flowService.saveStatus()) {
          @case ('saving') { Guardando... }
          @case ('saved') { Guardado }
          @case ('error') { Error — Reintentar }
          @default { Guardar }
        }
      </button>
      <button (click)="reset()"
        class="text-sm border border-gray-600 text-gray-300 hover:text-red-400 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors">
        Reset Flow
      </button>
    </div>
  `,
})
export class FlowToolbarComponent {
  readonly flowService = inject(FlowService);

  save(): void {
    this.flowService.saveFlow();
  }

  reset(): void {
    if (window.confirm('¿Restablecer el flujo al default?')) {
      this.flowService.resetFlow();
    }
  }
}
