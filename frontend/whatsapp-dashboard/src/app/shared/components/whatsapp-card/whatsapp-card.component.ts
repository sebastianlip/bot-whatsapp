import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-whatsapp-card',
  standalone: true,
  imports: [CommonModule, CardModule],
  template: `
    <p-card 
      [header]="header" 
      [subheader]="subheader"
      styleClass="whatsapp-card shadow-lg rounded-lg"
      class="block"
    >
      <ng-content></ng-content>
      <ng-template pTemplate="footer" *ngIf="showFooter">
        <div class="flex justify-end pt-3">
          <ng-content select="[footer]"></ng-content>
        </div>
      </ng-template>
    </p-card>
  `,
  styles: []
})
export class WhatsappCardComponent {
  @Input() header: string = '';
  @Input() subheader: string = '';
  @Input() showFooter: boolean = false;
} 