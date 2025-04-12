import { Injectable } from '@angular/core';
import { Observable, of, catchError } from 'rxjs';
import { delay, map, retry } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  // Flag para habilitar/deshabilitar el modo de prueba (sin AWS)
  private readonly TEST_MODE = false; // Modo de AWS activado
  
  // Flag para control de errores CORS - cambiar a true si hay problemas persistentes de CORS
  private readonly CORS_AUTO_FALLBACK = false; // CORS está configurado correctamente en AWS
  
  // URL base de la API Lambda - ACTUALIZAR con tu URL de API Gateway
  private readonly API_URL = 'https://0wf1nv2l1k.execute-api.us-east-2.amazonaws.com/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /**
   * Obtener la lista de archivos desde AWS
   */
  getAllFiles(): Observable<any[]> {
    console.log('Solicitando archivos...');
    
    // Si estamos en modo de prueba, devolver datos simulados
    if (this.TEST_MODE) {
      console.log('Modo de prueba activado - devolviendo archivos simulados');
      return this.getLocalStorageFiles();
    }
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('No hay usuario autenticado para obtener archivos');
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
        retry(1), // Reintentar 1 vez en caso de error
        map(response => {
          if (response && response.items) {
            console.log('Archivos recibidos de AWS:', response.items);
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
            return this.getLocalStorageFiles();
          }
          
          // Devolver datos simulados en caso de error
          return this.TEST_MODE ? this.getLocalStorageFiles() : this.getFallbackFiles();
        })
      );
  }

  /**
   * Obtener archivos filtrados por número de teléfono
   */
  getFilesByPhoneNumber(phoneNumber: string): Observable<any[]> {
    console.log(`Filtrando archivos por teléfono: ${phoneNumber}`);
    
    // Si estamos en modo de prueba, devolver datos simulados
    if (this.TEST_MODE) {
      console.log('Modo de prueba activado - devolviendo archivos simulados filtrados');
      // Simular filtrado básico
      return this.getLocalStorageFiles(phoneNumber);
    }
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('No hay usuario autenticado para obtener archivos');
      return of([]);
    }

    const username = currentUser.username;
    console.log(`Obteniendo archivos para el usuario: ${username}, teléfono: ${phoneNumber}`);

    // Crear headers para la petición
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Llamar a la API Lambda para obtener archivos filtrados
    return this.http.post<any>(`${this.API_URL}/files/filter`, { 
      username, 
      phoneNumber 
    }, { headers })
      .pipe(
        retry(1), // Reintentar 1 vez en caso de error
        map(response => {
          if (response && response.items) {
            console.log('Archivos filtrados recibidos de AWS:', response.items);
            return response.items;
          }
          console.warn('No se recibieron elementos filtrados de la API');
          return [];
        }),
        catchError(error => {
          console.error('Error al filtrar archivos por teléfono:', error);
          
          // Si es un error de CORS u otro error de red y el auto-fallback está habilitado
          if (this.CORS_AUTO_FALLBACK && (error.status === 0 || error.status === 403)) {
            console.warn('Detectado error de CORS o red - cambiando a modo simulado');
            return this.getLocalStorageFiles(phoneNumber);
          }
          
          // Devolver datos simulados filtrados en caso de error
          return this.TEST_MODE ? this.getLocalStorageFiles(phoneNumber) : this.getFallbackFiles(phoneNumber);
        })
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
}
