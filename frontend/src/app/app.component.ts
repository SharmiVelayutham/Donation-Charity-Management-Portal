import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HelpChatComponent } from './help-chat/help-chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,HelpChatComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'donation-charity-portal';
}
