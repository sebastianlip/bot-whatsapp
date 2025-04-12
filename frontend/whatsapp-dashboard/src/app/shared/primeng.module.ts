import { NgModule } from '@angular/core';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { InputMaskModule } from 'primeng/inputmask';

@NgModule({
  exports: [
    ButtonModule,
    InputTextModule,
    CardModule,
    TableModule,
    DialogModule,
    ToastModule,
    ToolbarModule,
    FileUploadModule,
    ProgressBarModule,
    TooltipModule,
    ProgressSpinnerModule,
    DividerModule,
    InputMaskModule
  ]
})
export class PrimeNgModule { } 