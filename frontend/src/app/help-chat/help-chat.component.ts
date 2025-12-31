import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-help-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,         
    HttpClientModule
  ],
  templateUrl: './help-chat.component.html',
  styleUrls: ['./help-chat.component.css']
})
export class HelpChatComponent implements AfterViewChecked {
  isOpen = false;
  userMessage = '';
  messages: { sender: 'user' | 'bot'; text: string }[] = [];

  @ViewChild('chatBody') chatBody!: ElementRef;

  constructor(private http: HttpClient) {}

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    if (!this.userMessage.trim()) return;

    const msg = this.userMessage;
    this.messages.push({ sender: 'user', text: msg });
    this.userMessage = '';

    this.http.post<any>('http://localhost:4000/api/help/chat', { message: msg })
      .subscribe({
        next: res => {
          this.messages.push({ sender: 'bot', text: res.reply });
        },
        error: () => {
          this.messages.push({ sender: 'bot', text: 'Sorry, something went wrong.' });
        }
      });
  }

  ngAfterViewChecked() {
    if (this.chatBody) {
      this.chatBody.nativeElement.scrollTop =
        this.chatBody.nativeElement.scrollHeight;
    }
  }
}
