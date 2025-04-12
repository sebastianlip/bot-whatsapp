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
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DropdownModule } from 'primeng/dropdown';

// Interfaces
interface FileItem {
  id: string;
  username: string;
  phoneNumber: string;
  timestamp: string;
  s3Key: string;
  fileName: string;
  contactName: string;
  fileType: string;
  type: string;
  downloadUrl?: string;
  fileUrl?: string;
}

interface SortOption {
  label: string;
  value: string;
  direction: 'asc' | 'desc';
}

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
    ProgressSpinnerModule,
    DialogModule,
    MessageModule,
    SelectButtonModule,
    DropdownModule
  ],
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.scss'],
  providers: [MessageService]
})
export class FileListComponent implements OnInit {
  // Datos y estado
  files: FileItem[] = [];
  loading = false;
  phoneNumber: string = '';
  error: string = '';
  originalFiles: FileItem[] = []; // Para guardar la copia original sin filtrar
  
  // Configuración de la vista
  currentView: 'grid' | 'list' = 'grid';
  viewOptions = [
    { label: 'Tarjetas', value: 'grid', icon: 'pi pi-th-large' },
    { label: 'Lista', value: 'list', icon: 'pi pi-list' }
  ];
  
  // Opciones de ordenamiento
  selectedSort: string = 'date-desc';
  sortOptions: SortOption[] = [
    { label: 'Fecha (más reciente)', value: 'date-desc', direction: 'desc' },
    { label: 'Fecha (más antigua)', value: 'date-asc', direction: 'asc' },
    { label: 'Nombre (A-Z)', value: 'name-asc', direction: 'asc' },
    { label: 'Nombre (Z-A)', value: 'name-desc', direction: 'desc' },
    { label: 'Tipo', value: 'type-asc', direction: 'asc' }
  ];
  
  // Diálogo de detalles
  displayDialog: boolean = false;
  selectedFile: FileItem | null = null;

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
        this.processFiles(files);
        this.loading = false;
        this.messageService.add({
          severity: 'success', 
          summary: 'Éxito', 
          detail: `Se cargaron ${files.length} archivos`
        });
      },
      error: (err) => {
        console.error('Error al cargar archivos:', err);
        this.error = 'No se pudieron cargar los archivos. Por favor, intenta de nuevo.';
        this.loading = false;
        this.messageService.add({
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudieron cargar los archivos'
        });
      }
    });
  }

  /**
   * Procesar archivos recibidos para asegurar que tengan todos los campos necesarios
   */
  private processFiles(files: any[]): void {
    // Procesar archivos para asegurar que tengan todos los campos necesarios
    this.files = files.map(file => ({
      ...file,
      type: file.type || file.fileType || this.determineFileType(file.fileName || ''),
      fileName: file.fileName || file.filename || 'Sin nombre'
    }));
    
    // Guardar copia original
    this.originalFiles = [...this.files];
    
    // Aplicar ordenamiento seleccionado
    this.applySorting();
  }

  /**
   * Determinar el tipo de archivo basado en extensión
   */
  private determineFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'image';
    } else if (['mp4', 'avi', 'mov', 'webm'].includes(extension)) {
      return 'video';
    } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
      return 'document';
    } else if (['mp3', 'wav', 'ogg', 'opus'].includes(extension)) {
      return 'audio';
    }
    
    return 'file';
  }

  /**
   * Filtrar archivos por número de teléfono
   */
  filterByPhoneNumber(): void {
    if (!this.phoneNumber.trim()) {
      this.loadFiles();
      return;
    }
    
    this.error = '';
    this.loading = true;
    
    // Limpiar espacios y normalizar la búsqueda
    const searchTerm = this.phoneNumber.trim().toLowerCase();
    
    // Si tenemos archivos en memoria, filtramos localmente para una respuesta más rápida
    if (this.originalFiles.length > 0) {
      this.files = this.originalFiles.filter(file => 
        file.phoneNumber.toLowerCase().includes(searchTerm) || 
        (file.contactName && file.contactName.toLowerCase().includes(searchTerm))
      );
      
      this.loading = false;
      
      if (this.files.length === 0) {
        this.messageService.add({
          severity: 'info', 
          summary: 'Búsqueda', 
          detail: 'No se encontraron archivos que coincidan con la búsqueda'
        });
      } else {
        this.messageService.add({
          severity: 'info', 
          summary: 'Búsqueda', 
          detail: `Se encontraron ${this.files.length} archivos`
        });
      }
      
      return;
    }
    
    // Si no tenemos archivos en memoria o queremos forzar la búsqueda en el servidor
    this.fileService.getFilesByPhoneNumber(this.phoneNumber).subscribe({
      next: (files) => {
        console.log('Archivos filtrados:', files);
        this.processFiles(files);
        this.loading = false;
        
        if (files.length === 0) {
          this.messageService.add({
            severity: 'info', 
            summary: 'Búsqueda', 
            detail: 'No se encontraron archivos que coincidan con la búsqueda'
          });
        } else {
          this.messageService.add({
            severity: 'info', 
            summary: 'Búsqueda', 
            detail: `Se encontraron ${files.length} archivos`
          });
        }
      },
      error: (err) => {
        console.error('Error al filtrar archivos:', err);
        this.error = 'No se pudieron filtrar los archivos. Por favor, intenta de nuevo.';
        this.loading = false;
        this.messageService.add({
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudieron filtrar los archivos'
        });
      }
    });
  }

  /**
   * Limpiar filtro y mostrar todos los archivos
   */
  clearFilter(): void {
    this.phoneNumber = '';
    
    // Si tenemos los archivos originales en memoria, los restauramos
    if (this.originalFiles.length > 0) {
      this.files = [...this.originalFiles];
      this.applySorting();
      return;
    }
    
    // Si no tenemos archivos en memoria, cargamos nuevamente
    this.loadFiles();
  }

  /**
   * Aplicar el ordenamiento seleccionado
   */
  applySorting(): void {
    const sortOption = this.sortOptions.find(option => option.value === this.selectedSort);
    
    if (!sortOption || !this.files.length) return;
    
    // Ordenar los archivos según la opción seleccionada
    this.files.sort((a, b) => {
      const direction = sortOption.direction === 'asc' ? 1 : -1;
      
      switch (sortOption.value) {
        case 'date-asc':
        case 'date-desc':
          return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * direction;
          
        case 'name-asc':
        case 'name-desc':
          return (a.fileName || '').localeCompare(b.fileName || '') * direction;
          
        case 'type-asc':
          return (a.type || '').localeCompare(b.type || '');
          
        default:
          return 0;
      }
    });
  }

  /**
   * Descargar un archivo
   */
  downloadFile(file: FileItem | null): void {
    if (!file) return;
    
    if (file.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
      return;
    }
    
    if (file.s3Key) {
      const downloadUrl = this.getFileDownloadUrl(file.s3Key);
      window.open(downloadUrl, '_blank');
      
      this.messageService.add({
        severity: 'success', 
        summary: 'Descarga', 
        detail: 'El archivo se está descargando'
      });
    } else {
      this.error = 'No se puede descargar este archivo.';
      this.messageService.add({
        severity: 'error', 
        summary: 'Error', 
        detail: 'No se puede descargar este archivo'
      });
    }
  }
  
  /**
   * Obtener URL de descarga para un archivo específico
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
    if (!timestamp) return 'Fecha desconocida';
    
    try {
      return new Date(timestamp).toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error al formatear fecha:', e);
      return timestamp;
    }
  }
  
  /**
   * Mostrar detalles del archivo seleccionado
   */
  viewFileDetails(file: FileItem): void {
    this.selectedFile = file;
    this.displayDialog = true;
  }
}
