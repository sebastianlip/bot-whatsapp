import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileListComponent } from './file-list/file-list.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FileListComponent],
  template: `
    <div class="container mx-auto p-4">
      <app-file-list></app-file-list>
    </div>
  `,
  styles: []
})
export class DashboardComponent {} 