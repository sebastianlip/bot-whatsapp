import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { PrimeNgModule } from './primeng.module';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { MenubarModule } from 'primeng/menubar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';

// Components
import { HeaderComponent } from './layout/header/header.component';

// Proveedores
import { MessageService, ConfirmationService } from 'primeng/api';

const PRIME_MODULES = [
  ButtonModule,
  InputTextModule,
  PasswordModule,
  CardModule,
  TableModule,
  ToastModule,
  ToolbarModule,
  MenubarModule,
  ConfirmDialogModule,
  DialogModule,
  FileUploadModule,
  DividerModule,
  ProgressBarModule,
  TooltipModule
];

@NgModule({
  declarations: [
    HeaderComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    PrimeNgModule,
    ...PRIME_MODULES
  ],
  exports: [
    // Modules
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    PrimeNgModule,
    ...PRIME_MODULES,
    
    // Components
    HeaderComponent
  ],
  providers: [
    MessageService,
    ConfirmationService
  ]
})
export class SharedModule { }
