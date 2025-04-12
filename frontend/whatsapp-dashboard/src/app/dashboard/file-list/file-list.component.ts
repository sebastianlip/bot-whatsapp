import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService } from '../../core/services/file.service';
import { AuthService } from '../../core/services/auth.service';
import { MessageService } from 'primeng/api';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    ToastModule,
    ToolbarModule,
    InputTextModule,
    TooltipModule,
    ProgressSpinnerModule
  ],
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.scss'],
  providers: [MessageService]
})
export class FileListComponent implements OnInit {
  files: any[] = [];
  loading = false;
  phoneNumber: string = '';
  error: string = '';
  
  // Columnas de la tabla
  cols = [
    { field: 'timestamp', header: 'Fecha' },
    { field: 'type', header: 'Tipo' },
    { field: 'filename', header: 'Nombre' },
    { field: 'contactName', header: 'Contacto' },
    { field: 'phoneNumber', header: 'Teléfono' }
  ];

  constructor(
    private fileService: FileService,
    private authService: AuthService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    // Obtener datos del usuario
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.attributes && currentUser.attributes['phone_number']) {
      this.phoneNumber = currentUser.attributes['phone_number'];
    }
    
    // Cargar archivos
    this.loadFiles();
  }

  /**
   * Cargar todos los archivos
   */
  loadFiles(): void {
    this.error = '';
    this.loading = true;
    
    this.fileService.getAllFiles().subscribe({
      next: (files) => {
        console.log('Archivos obtenidos:', files);
        this.files = files;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar archivos:', err);
        this.error = 'No se pudieron cargar los archivos. Por favor, intenta de nuevo.';
        this.loading = false;
      }
    });
  }

  /**
   * Filtrar archivos por número de teléfono
   */
  filterByPhoneNumber(): void {
    if (!this.phoneNumber) {
      this.loadFiles();
      return;
    }
    
    this.error = '';
    this.loading = true;
    
    this.fileService.getFilesByPhoneNumber(this.phoneNumber).subscribe({
      next: (files) => {
        console.log('Archivos filtrados:', files);
        this.files = files;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al filtrar archivos:', err);
        this.error = 'No se pudieron filtrar los archivos. Por favor, intenta de nuevo.';
        this.loading = false;
      }
    });
  }

  /**
   * Descargar un archivo
   */
  downloadFile(file: any): void {
    if (!file.downloadUrl) {
      console.error('No hay URL de descarga disponible para el archivo:', file);
      this.error = 'No se puede descargar este archivo.';
      return;
    }
    
    // Abrir URL de descarga en una nueva pestaña
    window.open(file.downloadUrl, '_blank');
  }
  
  /**
   * Obtener URL de descarga para un archivo específico
   * Nota: Este método utiliza getDownloadUrl correctamente sin usar subscribe
   */
  getFileDownloadUrl(s3Key: string): string {
    if (!s3Key) {
      console.error('No se proporcionó clave S3');
      return '';
    }
    return this.fileService.getDownloadUrl(s3Key);
  }
  
  /**
   * Formatear fecha para mostrar
   */
  formatDate(timestamp: string): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  }
}
