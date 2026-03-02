import { Component, inject } from '@angular/core';
import { FlowService } from '../../services/flow.service';
import { ThemeService } from '../../services/theme.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-flow-toolbar',
  standalone: true,
  imports: [],
  template: `
    <div class="px-4 py-2 flex items-center gap-2 border-b"
      style="background: var(--bg-secondary); border-color: var(--border-primary);">
      <button (click)="themeService.toggle()"
        class="text-xs font-medium px-2.5 py-1.5 rounded-md transition-all duration-150"
        style="border: 1px solid var(--border-primary); color: var(--text-secondary);"
        [title]="i18n.t('toolbar.toggleTheme')">
        @if (themeService.theme() === 'dark') {
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        }
      </button>
      <button (click)="i18n.toggleLocale()"
        class="text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all duration-150"
        style="border: 1px solid var(--border-primary); color: var(--text-secondary);">
        {{ i18n.locale() === 'en' ? 'ES' : 'EN' }}
      </button>
      <button (click)="save()"
        [disabled]="flowService.saveStatus() === 'saving'"
        class="text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-150 disabled:opacity-40"
        style="border: 1px solid var(--border-primary); color: var(--text-secondary);">
        @switch (flowService.saveStatus()) {
          @case ('saving') { {{ i18n.t('toolbar.saving') }} }
          @case ('saved') { {{ i18n.t('toolbar.saved') }} }
          @case ('error') { {{ i18n.t('toolbar.error') }} }
          @default { {{ i18n.t('toolbar.save') }} }
        }
      </button>
      <button (click)="reset()"
        class="text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-150 hover:text-red-400 hover:border-red-400/70"
        style="border: 1px solid var(--border-primary); color: var(--text-secondary);">
        {{ i18n.t('toolbar.resetFlow') }}
      </button>
    </div>
  `,
})
export class FlowToolbarComponent {
  readonly flowService = inject(FlowService);
  readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);

  save(): void {
    this.flowService.saveFlow();
  }

  reset(): void {
    if (window.confirm(this.i18n.t('toolbar.resetConfirm'))) {
      this.flowService.resetFlow();
    }
  }
}
