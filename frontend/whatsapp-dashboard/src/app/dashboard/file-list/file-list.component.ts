import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService } from '../../core/services/file.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.scss']
})
export class FileListComponent implements OnInit {
  // Datos y estado
  files: any[] = [];
  loading = false;
  searchTerm: string = '';
  error: string = '';
  errorMessage: string = '';
  originalFiles: any[] = []; // Para guardar la copia original sin filtrar
  
  // Propiedades para ordenamiento
  sortField: string = 'name';
  sortOrder: number = 1;
  
  // Opciones de ordenamiento
  selectedSort: string = 'date-desc';
  sortOptions: any[] = [
    { label: 'Fecha (más reciente)', value: 'date-desc', direction: 'desc' },
    { label: 'Fecha (más antigua)', value: 'date-asc', direction: 'asc' },
    { label: 'Nombre (A-Z)', value: 'name-asc', direction: 'asc' },
    { label: 'Nombre (Z-A)', value: 'name-desc', direction: 'desc' },
    { label: 'Formato (A-Z)', value: 'format-asc', direction: 'asc' },
    { label: 'Formato (Z-A)', value: 'format-desc', direction: 'desc' }
  ];
  
  // Diálogo de detalles
  displayDialog: boolean = false;
  selectedFile: any = null;
  
  // Propiedades para previsualización
  displayPreview: boolean = false;
  previewUrl: string = '';
  filteredFiles: any[] = [];

  constructor(
    private fileService: FileService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
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
      },
      error: (err) => {
        console.error('Error al cargar archivos:', err);
        this.error = 'No se pudieron cargar los archivos. Por favor, intenta de nuevo.';
        this.loading = false;
      }
    });
  }

  /**
   * Procesar archivos recibidos para asegurar que tengan todos los campos necesarios
   */
  private processFiles(files: any[]): void {
    // Procesar archivos para asegurar que tengan todos los campos necesarios
    this.files = files.map(file => {
      const fileExtension = this.getFileExtension(file.fileName || 'Sin nombre');
      return {
        ...file,
        type: file.type || file.fileType || this.determineFileType(file.fileName || ''),
        fileName: file.fileName || file.filename || 'Sin nombre',
        fileFormat: fileExtension.toUpperCase(),
        size: this.formatFileSize(file.size || 0),
        name: file.fileName || file.filename || 'Sin nombre' // Para compatibilidad con el template
      };
    });
    
    // Guardar copia original
    this.originalFiles = [...this.files];
    this.filteredFiles = [...this.files];
    
    // Aplicar ordenamiento seleccionado
    this.applySorting();
  }

  /**
   * Formatear tamaño de archivo
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '—';
    
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obtener extensión del archivo
   */
  private getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Determinar el tipo de archivo basado en extensión
   */
  private determineFileType(fileName: string): string {
    const extension = this.getFileExtension(fileName);
    
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
   * Filtrar archivos por nombre
   */
  filterFiles(): void {
    if (!this.searchTerm.trim()) {
      this.filteredFiles = [...this.originalFiles];
      return;
    }
    
    // Limpiar espacios y normalizar la búsqueda
    const searchTerm = this.searchTerm.trim().toLowerCase();
    
    // Filtrar localmente
    this.filteredFiles = this.originalFiles.filter(file => 
      file.fileName.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Limpiar filtro y mostrar todos los archivos
   */
  clearFilter(): void {
    this.searchTerm = '';
    this.filteredFiles = [...this.originalFiles];
  }

  /**
   * Cambiar el orden al hacer clic en los encabezados de la tabla
   */
  toggleSort(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder * -1;
    } else {
      this.sortField = field;
      this.sortOrder = 1;
    }
    
    this.applySorting();
  }

  /**
   * Aplicar ordenamiento a la lista de archivos
   */
  applySorting(): void {
    this.filteredFiles.sort((a, b) => {
      let result = 0;
      
      if (this.sortField === 'name') {
        result = this.compareStrings(a.fileName, b.fileName);
      } else if (this.sortField === 'timestamp') {
        result = this.compareDates(a.timestamp, b.timestamp);
      } else if (this.sortField === 'fileFormat') {
        result = this.compareStrings(a.fileFormat || '', b.fileFormat || '');
      }
      
      return result * this.sortOrder;
    });
  }

  /**
   * Utilidad para comparar fechas en ordenamiento
   */
  private compareDates(dateA: string, dateB: string): number {
    const timeA = new Date(dateA).getTime();
    const timeB = new Date(dateB).getTime();
    
    return timeA - timeB;
  }

  /**
   * Utilidad para comparar strings en ordenamiento
   */
  private compareStrings(a: string, b: string): number {
    return a.localeCompare(b);
  }

  /**
   * Formatear fecha para mostrar
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'Fecha desconocida';
    
    const date = new Date(dateString);
    
    // Verificar si es una fecha válida
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    // Formatear fecha
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Obtener URL de descarga (temporal) para archivos en S3
   */
  getFileDownloadUrl(s3Key: string): string {
    if (!s3Key) return '#';
    
    // Lógica para generar URL de descarga
    return this.fileService.getFileUrl(s3Key);
  }

  /**
   * Descargar archivo
   */
  downloadFile(file: any): void {
    if (!file) return;
    
    // Si tenemos URL directo, usarlo
    if (file.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
      return;
    }
    
    // Si tenemos clave S3, generar URL firmado para descarga
    if (file.s3Key) {
      this.loading = true;
      
      this.fileService.getSignedUrl(file.s3Key).subscribe({
        next: (url) => {
          console.log('URL firmado obtenido:', url);
          this.loading = false;
          window.open(url, '_blank');
        },
        error: (err) => {
          console.error('Error al obtener URL firmado:', err);
          this.loading = false;
          this.error = 'No se pudo descargar el archivo';
        }
      });
    }
  }

  /**
   * Mostrar detalles del archivo
   */
  viewFileDetails(file: any): void {
    this.selectedFile = file;
    this.displayDialog = true;
  }

  /**
   * Obtener icono según tipo de archivo
   */
  getIconClass(file: any): string {
    if (!file) return 'bi-file';
    
    switch (file.type) {
      case 'image':
        return 'bi-file-image';
      case 'video':
        return 'bi-file-play';
      case 'document':
        if (file.fileName.endsWith('.pdf')) return 'bi-file-pdf';
        if (file.fileName.endsWith('.xlsx') || file.fileName.endsWith('.xls')) return 'bi-file-excel';
        if (file.fileName.endsWith('.docx') || file.fileName.endsWith('.doc')) return 'bi-file-word';
        return 'bi-file-text';
      case 'audio':
        return 'bi-file-music';
      default:
        return 'bi-file';
    }
  }

  /**
   * Mostrar archivo para previsualización
   */
  viewFile(file: any): void {
    this.selectedFile = file;
    this.displayPreview = true;
    
    // Generar URL de previsualización si es necesario
    if (file.fileUrl) {
      this.previewUrl = file.fileUrl;
    } else if (file.downloadUrl) {
      this.previewUrl = file.downloadUrl;
    } else if (file.s3Key) {
      // Obtener URL firmada para S3
      this.fileService.getSignedUrl(file.s3Key).subscribe({
        next: (url) => {
          this.previewUrl = url;
        },
        error: (err) => {
          console.error('Error al obtener URL de previsualización:', err);
          this.previewUrl = 'https://via.placeholder.com/400x300?text=Error+al+cargar+archivo';
        }
      });
    } else {
      // URL predeterminada si no hay otra disponible
      this.previewUrl = 'https://via.placeholder.com/400x300?text=Archivo+no+disponible';
    }
  }

  /**
   * Verificar si el archivo es una imagen
   */
  isImage(file: any): boolean {
    if (!file) return false;
    return file.type === 'image';
  }

  /**
   * Verificar si el archivo es un PDF
   */
  isPdf(file: any): boolean {
    if (!file) return false;
    return file.fileName.toLowerCase().endsWith('.pdf');
  }

  /**
   * Verificar si el archivo es un audio
   */
  isAudio(file: any): boolean {
    if (!file) return false;
    return file.type === 'audio';
  }

  /**
   * Verificar si el archivo es un video
   */
  isVideo(file: any): boolean {
    if (!file) return false;
    return file.type === 'video';
  }

  /**
   * Verificar si el archivo es previsualizable
   */
  isPreviewable(file: any): boolean {
    if (!file) return false;
    return this.isImage(file) || this.isPdf(file) || this.isAudio(file) || this.isVideo(file);
  }
}
