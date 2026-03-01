import { Component } from '@angular/core';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { CanvasComponent } from '../components/canvas/canvas.component';
import { ChatComponent } from '../components/chat/chat.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [SidebarComponent, CanvasComponent, ChatComponent],
  template: `
    <div class="grid h-screen" style="grid-template-columns: 240px 1fr 360px;">
      <app-sidebar />
      <app-canvas />
      <app-chat />
    </div>
  `,
})
export default class Home {}
