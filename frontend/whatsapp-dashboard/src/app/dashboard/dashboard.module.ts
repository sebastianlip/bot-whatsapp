import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Servicios y proveedores
import { FileService } from '../core/services/file.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  providers: [
    FileService
  ]
})
export class DashboardModule { }
