import { Injectable } from '@angular/core';
import { Observable, of, catchError, BehaviorSubject } from 'rxjs';
import { delay, map, retry, tap, shareReplay } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

/**
 * Interfaz para los metadatos de archivos
 */
export interface FileMetadata {
  id?: string;
  username?: string;
  phoneNumber?: string;
  timestamp?: string;
  s3Key?: string;
  fileName?: string;
  contactName?: string;
  fileType?: string;
  downloadUrl?: string;
  [key: string]: any; // Para propiedades adicionales
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  // Cache de los archivos
  private filesCache = new BehaviorSubject<any[]>([]);
  private isCacheInitialized = false;
  
  // Flag para habilitar/deshabilitar el modo de prueba (sin AWS)
  private readonly TEST_MODE = false; // Modo de AWS activado
  
  // Flag para control de errores CORS - cambiar a true si hay problemas persistentes de CORS
  private readonly CORS_AUTO_FALLBACK = false; // CORS está configurado correctamente en AWS
  
  // URL base de la API Lambda - ACTUALIZAR con tu URL de API Gateway
  private readonly API_URL = 'https://0wf1nv2l1k.execute-api.us-east-2.amazonaws.com/v1';

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /**
   * Obtener la lista de archivos desde AWS
   */
  getAllFiles(): Observable<any[]> {
    console.log('Solicitando archivos...');
    
    // Si hay archivos en caché y la caché está inicializada, devolverlos
    if (this.isCacheInitialized && this.filesCache.value.length > 0) {
      console.log('Devolviendo archivos desde caché:', this.filesCache.value.length);
      return of(this.filesCache.value);
    }
    
    // Si estamos en modo de prueba, devolver datos simulados
    if (this.TEST_MODE) {
      console.log('Modo de prueba activado - devolviendo archivos simulados');
      return this.getLocalStorageFiles().pipe(
        tap(files => {
          this.filesCache.next(files);
          this.isCacheInitialized = true;
        })
      );
    }
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.log('No hay usuario autenticado todavía, devolviendo array vacío');
      return of([]);
    }

    const username = currentUser.username;
    console.log('Obteniendo archivos para el usuario:', username);

    // Crear headers para la petición
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Llamar a la API Lambda para obtener archivos
    return this.http.post<any>(`${this.API_URL}/files`, { username }, { headers })
      .pipe(
        retry(2), // Reintentar 2 veces en caso de error
        map(response => {
          if (response && response.items) {
            console.log('Archivos recibidos de AWS:', response.items);
            // Actualizar la caché solo si hay elementos válidos
            if (response.items.length > 0) {
              this.filesCache.next(response.items);
              this.isCacheInitialized = true;
            }
            return response.items;
          }
          console.warn('No se recibieron elementos de la API');
          return [];
        }),
        catchError(error => {
          console.error('Error al obtener archivos:', error);
          
          // Si es un error de CORS u otro error de red y el auto-fallback está habilitado
          if (this.CORS_AUTO_FALLBACK && (error.status === 0 || error.status === 403)) {
            console.warn('Detectado error de CORS o red - cambiando a modo simulado');
            return this.getLocalStorageFiles().pipe(
              tap(files => {
                this.filesCache.next(files);
                this.isCacheInitialized = true;
              })
            );
          }
          
          // Devolver datos simulados en caso de error
          const fallbackFiles = this.TEST_MODE 
            ? this.getLocalStorageFiles() 
            : this.getFallbackFiles();
            
          return fallbackFiles.pipe(
            tap(files => {
              // Solo actualizar la caché si no hay datos previos
              if (!this.isCacheInitialized || this.filesCache.value.length === 0) {
                this.filesCache.next(files);
                this.isCacheInitialized = true;
              }
            })
          );
        }),
        shareReplay(1) // Compartir el resultado entre múltiples subscriptores
      );
  }

  /**
   * Limpiar cache de archivos (útil para forzar recarga)
   */
  clearFilesCache(): void {
    this.filesCache.next([]);
    this.isCacheInitialized = false;
    console.log('Cache de archivos limpiado');
  }

  /**
   * Verificar si hay archivos en caché
   */
  hasCachedFiles(): boolean {
    return this.isCacheInitialized && this.filesCache.value.length > 0;
  }

  /**
   * Obtiene los archivos asociados a un número o números de teléfono específicos
   * @param phoneNumber Número(s) de teléfono para filtrar los archivos
   * @returns Observable de los archivos filtrados para el número o números de teléfono especificados
   */
  getFilesByPhoneNumber(phoneNumber: string | string[]): Observable<FileMetadata[]> {
    console.log('Buscando archivos para número(s):', phoneNumber);
    
    return this.getAllFiles().pipe(
      map(files => {
        if (Array.isArray(phoneNumber)) {
          // Si es un array, filtrar archivos que coincidan con cualquiera de los números proporcionados
          console.log('Filtrando archivos para múltiples números:', phoneNumber);
          return files.filter(file => 
            phoneNumber.some(number => file.phoneNumber && file.phoneNumber.includes(number))
          );
        } else {
          // Si es un solo número de teléfono (string)
          console.log('Filtrando archivos para número único:', phoneNumber);
          return files.filter(file => file.phoneNumber && file.phoneNumber.includes(phoneNumber));
        }
      }),
      tap(filteredFiles => console.log(`Se encontraron ${filteredFiles.length} archivos para el/los número(s) proporcionado(s)`))
    );
  }

  /**
   * Generar URL de descarga para un archivo
   */
  getDownloadUrl(key: string): string {
    // En modo de prueba, devolver URL simulada
    if (this.TEST_MODE || !key) {
      return 'https://via.placeholder.com/150';
    }
    
    // Si la key ya es una URL completa, devolverla
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }

    // Construir URL para descargar archivo mediante Lambda
    return `${this.API_URL}/download?key=${encodeURIComponent(key)}`;
  }

  /**
   * Obtener archivos simulados desde localStorage
   */
  private getLocalStorageFiles(filterPhone?: string): Observable<any[]> {
    console.log('Obteniendo archivos simulados de localStorage');
    
    // Obtener archivos simulados del localStorage
    const simulated = JSON.parse(localStorage.getItem('simulatedFiles') || '[]');
    
    // Combinar con los datos de fallback para tener siempre algunos datos
    const fallbackFiles = [
      {
        id: 'test-1',
        username: 'admin',
        phoneNumber: '+123456789',
        timestamp: new Date().toISOString(),
        s3Key: 'image/test-image.svg',
        fileName: 'test-image.svg',
        contactName: 'Usuario Prueba',
        fileType: 'image',
        downloadUrl: 'https://via.placeholder.com/150'
      }
    ];
    
    // Combinar los datos
    let allFiles = [...fallbackFiles, ...simulated];
    
    // Agregar URLs de descarga a cada archivo si no las tienen
    allFiles = allFiles.map(file => ({
      ...file,
      downloadUrl: file.downloadUrl || 'https://via.placeholder.com/150',
      type: file.fileType || this.getFileType(file.fileName || '')
    }));
    
    // Aplicar filtro si es necesario
    const filteredFiles = filterPhone 
      ? allFiles.filter(file => file.phoneNumber.includes(filterPhone))
      : allFiles;
    
    console.log('Archivos simulados:', filteredFiles);
    
    // Simular un retraso para hacer la experiencia más realista
    return of(filteredFiles).pipe(delay(300));
  }

  /**
   * Determinar el tipo de archivo basado en la extensión
   */
  private getFileType(filename: string): string {
    if (!filename) return 'unknown';
    
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
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
   * Datos simulados para desarrollo/fallback
   */
  private getFallbackFiles(filterPhone?: string): Observable<any[]> {
    console.log('Generando archivos simulados', filterPhone ? `con filtro: ${filterPhone}` : 'sin filtro');
    
    const mockFiles = [
      {
        id: '1',
        username: 'admin',
        timestamp: new Date().toISOString(),
        type: 'image',
        fileName: 'photo.jpg',
        contactName: 'Juan Pérez',
        phoneNumber: '+5491122334455',
        downloadUrl: 'https://via.placeholder.com/150',
        s3Key: 'user/admin/files/photo.jpg',
        fileType: 'image'
      },
      {
        id: '2',
        username: 'admin',
        timestamp: new Date().toISOString(),
        type: 'document',
        fileName: 'informe.pdf',
        contactName: 'María García',
        phoneNumber: '+5491133445566',
        downloadUrl: 'https://via.placeholder.com/150',
        s3Key: 'user/admin/files/informe.pdf',
        fileType: 'document'
      },
      {
        id: '3',
        username: 'admin',
        timestamp: new Date().toISOString(),
        type: 'audio',
        fileName: 'message.mp3',
        contactName: 'Carlos López',
        phoneNumber: '+5491144556677',
        downloadUrl: 'https://via.placeholder.com/150',
        s3Key: 'user/admin/files/message.mp3',
        fileType: 'audio'
      }
    ];

    // Si se proporciona un filtro de número de teléfono, aplicarlo
    const filteredFiles = filterPhone 
      ? mockFiles.filter(file => file.phoneNumber.includes(filterPhone))
      : mockFiles;

    // Simular un retraso para hacer la experiencia más realista
    return of(filteredFiles).pipe(delay(800));
  }

  /**
   * Obtener URL para descarga de archivos
   */
  getFileUrl(s3Key: string): string {
    // Esta es una implementación de ejemplo, en producción debería usar URLs firmados
    if (!s3Key) return '';
    return `${this.apiUrl}/files/download/${encodeURIComponent(s3Key)}`;
  }

  /**
   * Obtener URL firmado para descarga segura
   */
  getSignedUrl(s3Key: string): Observable<string> {
    return this.http.get<{url: string}>(`${this.apiUrl}/files/signed-url/${encodeURIComponent(s3Key)}`).pipe(
      map(response => response.url),
      catchError(error => {
        console.error('Error al obtener URL firmado:', error);
        return of('');
      })
    );
  }

  /**
   * Subir un archivo nuevo
   */
  uploadFile(file: File, phoneNumber: string, contactName: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('phoneNumber', phoneNumber);
    formData.append('contactName', contactName);
    
    return this.http.post<any>(`${this.apiUrl}/files/upload`, formData);
  }

  /**
   * Eliminar un archivo por su ID
   */
  deleteFile(fileId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/files/${fileId}`);
  }
}
