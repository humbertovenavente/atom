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
    <div class="grid h-screen" style="grid-template-columns: 240px 1fr 360px;">
      <app-sidebar />
      <div class="flex flex-col overflow-hidden">
        <app-flow-toolbar />
        <app-canvas class="flex-1" />
      </div>
      <app-chat />
    </div>
  `,
})
export default class Home {}
