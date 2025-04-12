import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UploadService } from '../core/services/upload.service';

interface Message {
  severity: string;
  summary: string;
  detail: string;
}

@Component({
  selector: 'app-whatsapp-simulator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './whatsapp-simulator.component.html',
  styleUrls: ['./whatsapp-simulator.component.scss']
})
export class WhatsappSimulatorComponent implements OnInit {
  phoneNumber: string = '';
  contactName: string = '';
  selectedFile: File | null = null;
  isUploading: boolean = false;
  uploadedFiles: any[] = [];
  messages: Message[] = [];

  constructor(
    private uploadService: UploadService
  ) { }

  ngOnInit(): void {
    // Inicializar con el número del usuario actual o un valor predeterminado
    this.phoneNumber = '+54';
  }

  /**
   * Eliminar un mensaje de la lista
   */
  removeMessage(message: Message): void {
    this.messages = this.messages.filter(m => 
      m.summary !== message.summary || 
      m.detail !== message.detail
    );
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
   * Agregar mensaje al usuario
   */
  addMessage(severity: string, summary: string, detail: string): void {
    this.messages = [...this.messages, { severity, summary, detail }];
    
    // Eliminar el mensaje después de 5 segundos
    setTimeout(() => {
      this.messages = this.messages.filter(m => 
        m.summary !== summary || m.detail !== detail
      );
    }, 5000);
  }

  /**
   * Enviar archivo simulando WhatsApp
   */
  sendFile(): void {
    if (!this.selectedFile) {
      this.addMessage('danger', 'Error', 'Por favor, selecciona un archivo');
      return;
    }

    if (!this.phoneNumber || this.phoneNumber.length < 10) {
      this.addMessage('danger', 'Error', 'Ingresa un número de teléfono válido');
      return;
    }

    // Verificar tamaño del archivo (máximo 5MB)
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (this.selectedFile.size > maxSizeInBytes) {
      this.addMessage('danger', 'Error', 'El archivo es demasiado grande. El tamaño máximo permitido es 5MB.');
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
          
          this.addMessage('danger', 'Error', `Error al subir el archivo: ${errorDetail}`);
          
          console.error('Detalles del error:', result);
        } else {
          this.handleUploadSuccess(result);
        }
      },
      error: (err) => {
        console.error('Error en el servicio de carga:', err);
        this.isUploading = false;
        this.addMessage('danger', 'Error', `No se pudo enviar el archivo: ${err.message || 'Error desconocido'}`);
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
    
    this.addMessage('success', 'Éxito', 'Archivo enviado correctamente');
    
    // Limpiar selección
    this.selectedFile = null;
    
    // Limpiar input file (hack para resetear el input)
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }
}
