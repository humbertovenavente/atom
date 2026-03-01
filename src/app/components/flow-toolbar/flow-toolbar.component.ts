import { Component, inject } from '@angular/core';
import { FlowService } from '../../services/flow.service';

@Component({
  selector: 'app-flow-toolbar',
  standalone: true,
  imports: [],
  template: `
    <div class="bg-gray-900 border-b border-gray-700/50 px-4 py-2 flex items-center gap-2">
      <button (click)="save()"
        [disabled]="flowService.saveStatus() === 'saving'"
        class="text-xs font-medium border border-gray-600/70 text-gray-300 hover:text-white hover:border-gray-400 hover:bg-gray-800/50 px-3 py-1.5 rounded-md transition-all duration-150 disabled:opacity-40">
        @switch (flowService.saveStatus()) {
          @case ('saving') { Saving... }
          @case ('saved') { Saved }
          @case ('error') { Error — Retry }
          @default { Save }
        }
      </button>
      <button (click)="reset()"
        class="text-xs font-medium border border-gray-600/70 text-gray-300 hover:text-red-400 hover:border-red-400/70 hover:bg-red-400/5 px-3 py-1.5 rounded-md transition-all duration-150">
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
    if (window.confirm('Reset flow to default?')) {
      this.flowService.resetFlow();
    }
  }
}
