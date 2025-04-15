import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService } from '../../core/services/file.service';
import { AuthService } from '../../core/services/auth.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription, timer } from 'rxjs';
import { retry, take } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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
export class FileListComponent implements OnInit, OnDestroy {
  // Datos y estado
  files: any[] = [];
  loading = false;
  searchTerm: string = '';
  error: string = '';
  errorMessage: string = '';
  originalFiles: any[] = []; // Para guardar la copia original sin filtrar
  
  // Control de carga de datos
  private loadAttempts = 0;
  private maxLoadAttempts = 3;
  private loadSubscription?: Subscription;
  
  // Propiedades para ordenamiento
  sortField: string = 'timestamp';
  sortOrder: number = -1; // -1 para ordenar descendente (más nuevo primero)
  
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
  previewUrl: SafeResourceUrl | string = '';
  filteredFiles: any[] = [];
  
  // Paginación
  pageSizeOptions: number[] = [10, 20, 50];
  pageSize: number = 10;
  currentPage: number = 1;
  pagedFiles: any[] = [];

  private retryTimer: NodeJS.Timeout | null = null;

  constructor(
    private fileService: FileService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.loadFilesWithRetry();
  }

  ngOnDestroy(): void {
    if (this.loadSubscription) {
      this.loadSubscription.unsubscribe();
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  /**
   * Cargar archivos con lógica de reintento
   */
  loadFilesWithRetry(): void {
    console.log('FileListComponent: Iniciando carga de archivos con reintentos');
    this.loadAttempts = 0;
    this.loading = true;
    this.error = '';
    
    // Limpiamos cualquier temporizador anterior
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    
    // Verificar primero si el servicio de auth está inicializado
    const authInitialized = this.authService.isInitializedService();
    if (!authInitialized) {
      console.log('FileListComponent: Servicio de autenticación no inicializado, esperando...');
      this.retryTimer = setTimeout(() => this.loadFilesWithRetry(), 1000);
      return;
    }
    
    this.attemptLoadFiles();
  }
  
  /**
   * Intentar cargar archivos con lógica de reintentos
   */
  attemptLoadFiles(): void {
    this.loadAttempts++;
    console.log(`FileListComponent: Intento #${this.loadAttempts} de cargar archivos`);
    
    if (!this.authService.isInitializedService()) {
      console.log('FileListComponent: Auth service no inicializado. Reintentando en unos segundos...');
      const delay = Math.min(2000 * this.loadAttempts, 10000);
      this.retryTimer = setTimeout(() => this.attemptLoadFiles(), delay);
      return;
    }
    
    if (!this.authService.isAuthenticated()) {
      console.log('FileListComponent: Usuario no autenticado. Reintentando en unos segundos...');
      const delay = Math.min(2000 * this.loadAttempts, 10000);
      this.retryTimer = setTimeout(() => this.attemptLoadFiles(), delay);
      return;
    }
    
    console.log('FileListComponent: Usuario autenticado, procediendo a cargar archivos');
    // Obtener todos los archivos
    this.loadFiles();
  }

  /**
   * Cargar archivos del usuario
   */
  loadFiles(): void {
    console.log('FileListComponent: Cargando archivos desde FileService');
    this.loading = true;
    this.error = '';
    
    // Obtener el usuario actual
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      console.error('FileListComponent: No hay usuario autenticado para cargar archivos');
      this.loading = false;
      this.error = 'No se pudo verificar el usuario. Por favor, inicie sesión.';
      return;
    }
    
    // Obtener números de teléfono asociados al usuario actual
    const phoneNumbers = this.authService.getUserPhoneNumbers();
    console.log('FileListComponent: Números de teléfono encontrados:', phoneNumbers);
    
    if (!phoneNumbers || phoneNumbers.length === 0) {
      // Si no hay números de teléfono, obtener todos los archivos
      console.log('FileListComponent: No se encontraron números de teléfono. Obteniendo todos los archivos...');
      this.fileService.getAllFiles().subscribe({
        next: (data: any[]) => this.handleFilesResponse(data),
        error: (err: any) => this.handleFilesError(err)
      });
    } else if (phoneNumbers.length === 1) {
      // Si hay un solo número, pasarlo directamente como string
      console.log(`FileListComponent: Obteniendo archivos para el número: ${phoneNumbers[0]}`);
      this.fileService.getFilesByPhoneNumber(phoneNumbers[0]).subscribe({
        next: (data: any[]) => this.handleFilesResponse(data),
        error: (err: any) => this.handleFilesError(err)
      });
    } else {
      // Si hay múltiples números, cargar todos los archivos y filtrar en el cliente
      console.log(`FileListComponent: Múltiples números detectados, obteniendo todos los archivos`);
    this.fileService.getAllFiles().subscribe({
        next: (data: any[]) => {
          // Filtrar los archivos por los números de teléfono del usuario
          const filteredData = data.filter(file => 
            file.phoneNumber && phoneNumbers.some(number => file.phoneNumber.includes(number))
          );
          this.handleFilesResponse(filteredData);
        },
        error: (err: any) => this.handleFilesError(err)
      });
    }
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
    // Actualizar paginación
    this.updatePagedFiles();
  }

  /**
   * Actualizar archivos paginados
   */
  updatePagedFiles(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedFiles = this.filteredFiles.slice(startIndex, endIndex);
  }
  
  /**
   * Cambiar de página
   */
  changePage(page: number): void {
    this.currentPage = page;
    this.updatePagedFiles();
  }
  
  /**
   * Cambiar tamaño de página
   */
  changePageSize(size: number): void {
    this.pageSize = size;
    // Al cambiar el tamaño, volvemos a la primera página
    this.currentPage = 1;
    this.updatePagedFiles();
  }
  
  /**
   * Obtener número total de páginas
   */
  get totalPages(): number {
    return Math.ceil(this.filteredFiles.length / this.pageSize);
  }
  
  /**
   * Obtener array de páginas para mostrar
   */
  get pageNumbers(): number[] {
    // Mostrar máximo 5 páginas
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    
    if (totalPages <= 5) {
      return Array.from({length: totalPages}, (_, i) => i + 1);
    }
    
    // Si estamos en las primeras 3 páginas
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    
    // Si estamos en las últimas 3 páginas
    if (currentPage >= totalPages - 2) {
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      ];
    }
    
    // En medio
    return [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2
    ];
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
    } else {
      // Limpiar espacios y normalizar la búsqueda
      const searchTerm = this.searchTerm.trim().toLowerCase();
      
      // Filtrar localmente
      this.filteredFiles = this.originalFiles.filter(file => 
        file.fileName.toLowerCase().includes(searchTerm)
      );
    }
    
    // Aplicar ordenamiento
    this.applySorting();
    
    // Volver a primera página
    this.currentPage = 1;
    
    // Actualizar vista paginada
    this.updatePagedFiles();
  }

  /**
   * Limpiar filtro y mostrar todos los archivos
   */
  clearFilter(): void {
    this.searchTerm = '';
    this.filteredFiles = [...this.originalFiles];
    
    // Aplicar ordenamiento
    this.applySorting();
    
    // Volver a primera página
    this.currentPage = 1;
    
    // Actualizar vista paginada
    this.updatePagedFiles();
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
    this.updatePagedFiles();
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
    
    // Añadir clase modal-open al body para gestionar correctamente el scroll
    document.body.classList.add('modal-open');
    
    // Establecer una URL predeterminada mientras se carga la URL real
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    
    // Generar URL de previsualización si es necesario
    if (file.fileUrl) {
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(file.fileUrl);
    } else if (file.downloadUrl) {
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(file.downloadUrl);
    } else if (file.s3Key) {
      // Obtener URL firmada para S3
      this.fileService.getSignedUrl(file.s3Key).subscribe({
        next: (url) => {
          this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        },
        error: (err) => {
          console.error('Error al obtener URL de previsualización:', err);
          this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl('https://via.placeholder.com/400x300?text=Error+al+cargar+archivo');
        }
      });
    } else {
      // URL predeterminada si no hay otra disponible
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl('https://via.placeholder.com/400x300?text=Archivo+no+disponible');
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

  // Cerrar modal de previsualización
  closePreview(): void {
    // Primero marcamos como no visible el modal
    this.displayPreview = false;
    
    // Limpiar la URL con un pequeño retraso para evitar efectos visuales extraños
    setTimeout(() => {
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
      this.selectedFile = null;
      
      // Remover clases de modal-open del body
      document.body.classList.remove('modal-open');
      
      // Remover cualquier modal-backdrop que pueda haber quedado
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => {
        backdrop.parentNode?.removeChild(backdrop);
      });
    }, 150);
  }

  private isAdmin(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.username === 'admin' || 
           !!(currentUser?.attributes && currentUser.attributes['role'] === 'admin');
  }

  private handleFilesResponse(data: any[]): void {
    this.processFiles(data);
    this.loading = false;
  }

  private handleFilesError(err: any): void {
    console.error('Error al cargar archivos:', err);
    this.error = 'No se pudieron cargar los archivos. Por favor, intenta de nuevo.';
    this.loading = false;
  }
}
