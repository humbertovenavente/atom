import { Component } from '@angular/core';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { CanvasComponent } from '../components/canvas/canvas.component';
import { ChatComponent } from '../components/chat/chat.component';
import { FlowToolbarComponent } from '../components/flow-toolbar/flow-toolbar.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [SidebarComponent, CanvasComponent, ChatComponent, FlowToolbarComponent],
  template: `
    <div class="grid h-screen overflow-hidden" style="grid-template-columns: 240px 1fr 360px; grid-template-rows: 1fr;">
      <app-sidebar class="overflow-hidden" />
      <div class="flex flex-col overflow-hidden min-h-0" style="background: var(--canvas-bg)">
        <app-flow-toolbar class="flex-shrink-0" />
        <app-canvas class="flex-1 min-h-0" />
      </div>
      <app-chat class="overflow-hidden" />
    </div>
  `,
})
export default class Home {}
