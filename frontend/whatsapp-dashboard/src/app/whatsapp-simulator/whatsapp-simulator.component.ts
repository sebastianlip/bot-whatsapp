import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UploadService } from '../core/services/upload.service';
import { MessageService } from 'primeng/api';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-whatsapp-simulator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputMaskModule,
    FileUploadModule,
    ToastModule,
    ProgressSpinnerModule,
    DividerModule
  ],
  templateUrl: './whatsapp-simulator.component.html',
  styleUrls: ['./whatsapp-simulator.component.scss'],
  providers: [MessageService]
})
export class WhatsappSimulatorComponent implements OnInit {
  phoneNumber: string = '';
  contactName: string = '';
  selectedFile: File | null = null;
  isUploading: boolean = false;
  uploadedFiles: any[] = [];

  constructor(
    private uploadService: UploadService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    // Inicializar con el número del usuario actual o un valor predeterminado
    this.phoneNumber = '+54';
  }

  /**
   * Manejar selección de archivo
   */
  onFileSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      console.log('Archivo seleccionado:', file.name);
    }
  }

  /**
   * Enviar archivo simulando WhatsApp
   */
  sendFile(): void {
    if (!this.selectedFile) {
      this.messageService.add({
        severity: 'error', 
        summary: 'Error', 
        detail: 'Por favor, selecciona un archivo'
      });
      return;
    }

    if (!this.phoneNumber || this.phoneNumber.length < 10) {
      this.messageService.add({
        severity: 'error', 
        summary: 'Error', 
        detail: 'Ingresa un número de teléfono válido'
      });
      return;
    }

    // Verificar tamaño del archivo (máximo 5MB)
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (this.selectedFile.size > maxSizeInBytes) {
      this.messageService.add({
        severity: 'error', 
        summary: 'Error', 
        detail: 'El archivo es demasiado grande. El tamaño máximo permitido es 5MB.'
      });
      return;
    }

    console.log(`Intentando enviar archivo: ${this.selectedFile.name} (${this.selectedFile.size} bytes)`);
    console.log(`Destino: ${this.phoneNumber}, Contacto: ${this.contactName || 'Usuario WhatsApp'}`);
    
    this.isUploading = true;
    
    this.uploadService.uploadFile(
      this.phoneNumber, 
      this.selectedFile, 
      this.contactName || 'Usuario WhatsApp'
    ).subscribe({
      next: (result: any) => {
        console.log('Resultado de carga:', result);
        this.isUploading = false;
        
        // Verificar si el resultado es una promesa (simulación) y resolverla
        if (result instanceof Promise) {
          result.then((resolvedResult: any) => {
            this.handleUploadSuccess(resolvedResult);
          });
        } else if (result.error) {
          const errorDetail = result.details ? 
            `${result.error} - ${result.details}` : 
            result.error;
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Error al subir el archivo: ${errorDetail}`
          });
          
          console.error('Detalles del error:', result);
        } else {
          this.handleUploadSuccess(result);
        }
      },
      error: (err) => {
        console.error('Error en el servicio de carga:', err);
        this.isUploading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `No se pudo enviar el archivo: ${err.message || 'Error desconocido'}`
        });
      }
    });
  }
  
  /**
   * Manejar el éxito de la carga
   */
  private handleUploadSuccess(result: any): void {
    // Agregar a lista de archivos subidos
    this.uploadedFiles.unshift({
      fileName: this.selectedFile?.name,
      phoneNumber: this.phoneNumber,
      contactName: this.contactName || 'Usuario WhatsApp',
      timestamp: new Date().toISOString(),
      fileUrl: result.fileUrl || 'https://via.placeholder.com/150'
    });
    
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Archivo enviado correctamente'
    });
    
    // Limpiar selección
    this.selectedFile = null;
    
    // Limpiar input file (hack para resetear el input)
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }
}
