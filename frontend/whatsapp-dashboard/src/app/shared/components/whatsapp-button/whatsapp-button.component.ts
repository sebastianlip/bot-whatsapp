import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-whatsapp-button',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <button 
      pButton 
      [type]="type" 
      [label]="label" 
      [icon]="icon" 
      [disabled]="disabled"
      [class]="getButtonClass()"
      (click)="onClick.emit($event)"
      class="px-4 py-2 rounded-lg"
    ></button>
  `,
  styles: []
})
export class WhatsappButtonComponent {
  @Input() label: string = '';
  @Input() icon: string = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Input() variant: 'primary' | 'secondary' = 'primary';
  
  @Output() onClick = new EventEmitter<any>();
  
  getButtonClass(): string {
    return this.variant === 'primary' 
      ? 'whatsapp-primary-btn' 
      : 'whatsapp-secondary-btn';
  }
} 