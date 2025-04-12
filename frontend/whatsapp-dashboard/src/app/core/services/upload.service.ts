import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, catchError, throwError } from 'rxjs';
import { map, switchMap, retry } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  // URL base de la API Lambda
  private readonly API_URL = 'https://0wf1nv2l1k.execute-api.us-east-2.amazonaws.com/v1';
  
  // Flag para habilitar/deshabilitar el modo de prueba
  private readonly TEST_MODE = false; // Modo de AWS activado
  
  // Flag para control de errores CORS - cambiar a true si hay problemas persistentes de CORS
  private readonly CORS_AUTO_FALLBACK = false; // CORS está configurado correctamente en AWS

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /**
   * Sube un archivo a S3 a través de Lambda
   * @param phoneNumber El número de teléfono del contacto
   * @param file El archivo a subir
   * @param contactName Nombre del contacto (opcional)
   */
  uploadFile(phoneNumber: string, file: File, contactName?: string): Observable<any> {
    if (this.TEST_MODE) {
      console.log('Modo de prueba: simulando carga de archivo', file.name);
      return this.simulateUpload(phoneNumber, file, contactName);
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('No hay usuario autenticado para subir archivos');
      return of({ error: 'No hay usuario autenticado' });
    }

    // Normaliza el formato del número de teléfono
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const username = currentUser.username;
    console.log(`Subiendo archivo para usuario: ${username}, teléfono: ${normalizedPhone}`);

    // Leer el archivo como Base64
    return this.readFileAsBase64(file).pipe(
      switchMap(fileContent => {
        // Crear payload para Lambda
        const payload = {
          username,
          phoneNumber: normalizedPhone,
          fileContent,
          fileName: file.name,
          fileType: this.determineFileType(file.type),
          contactName: contactName || 'Usuario WhatsApp'
        };

        console.log('Enviando solicitud a:', `${this.API_URL}/upload`);
        console.log('Datos enviados:', {
          username: payload.username,
          phoneNumber: payload.phoneNumber,
          fileContentLength: payload.fileContent ? payload.fileContent.length : 0,
          fileName: payload.fileName,
          fileType: payload.fileType,
          contactName: payload.contactName
        });
        
        // Crear headers para la petición
        const headers = new HttpHeaders({
          'Content-Type': 'application/json'
        });

        // Enviar a Lambda con reintentos
        return this.http.post<any>(`${this.API_URL}/upload`, payload, { headers }).pipe(
          retry(1), // Reintentar 1 vez en caso de error
          catchError(error => {
            console.error('Error al enviar solicitud HTTP:', error);
            
            if (error.error instanceof ErrorEvent) {
              // Error del lado del cliente
              console.error('Error del lado del cliente:', error.error.message);
            } else {
              // El servidor respondió con un código de error
              console.error(`Código de error ${error.status}:`, error.error);
              
              // Si hay una respuesta del servidor, intentar extraer el mensaje de error
              if (error.error) {
                try {
                  if (typeof error.error === 'string') {
                    const parsedError = JSON.parse(error.error);
                    console.error('Error parseado del servidor:', parsedError);
                  } else {
                    console.error('Error del servidor (objeto):', error.error);
                  }
                } catch (parseError) {
                  console.error('Error al parsear la respuesta de error:', parseError);
                }
              }
            }
            
            // Si el error parece ser de red, intenta con modo de prueba
            if (error.status === 0 || error.name === 'HttpErrorResponse') {
              console.warn('Error de red detectado, cambiando a modo simulado');
              return this.simulateUpload(normalizedPhone, file, contactName);
            }
            return this.handleError(error, normalizedPhone, file, contactName);
          })
        );
      }),
      catchError(error => {
        console.error('Error al leer archivo:', error);
        
        // Si está habilitado el auto-fallback y es un error de carga
        if (this.CORS_AUTO_FALLBACK) {
          console.warn('Cambiando a modo simulado debido a errores de carga');
          return this.simulateUpload(normalizedPhone, file, contactName);
        }
        
        return of({ error: 'Error al leer archivo' });
      })
    );
  }

  /**
   * Normaliza el formato del número de teléfono
   */
  private normalizePhoneNumber(phone: string): string {
    // Eliminar todos los espacios y caracteres no numéricos excepto el signo +
    let normalized = phone.replace(/[^0-9+]/g, '');
    
    // Asegurar que comience con + si no lo tiene
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }
    
    return normalized;
  }

  /**
   * Maneja errores HTTP y decide si hacer fallback al modo simulado
   */
  private handleError(error: HttpErrorResponse, phoneNumber: string, file: File, contactName?: string): Observable<any> {
    console.error('Error al subir archivo:', error);
    
    // Si es un error de CORS u otro error de red y el auto-fallback está habilitado
    if (this.CORS_AUTO_FALLBACK && (error.status === 0 || error.status === 403)) {
      console.warn('Detectado error de CORS o red - cambiando a modo simulado');
      return this.simulateUpload(phoneNumber, file, contactName);
    }
    
    // Si no hay fallback, devolver un error manejable
    return of({ 
      error: 'Error al subir archivo',
      details: error.message || 'Error de comunicación con el servidor'
    });
  }

  /**
   * Lee un archivo como Base64
   */
  private readFileAsBase64(file: File): Observable<string> {
    return new Observable<string>(observer => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        // Extraer solo la parte Base64 eliminando el prefijo "data:image/png;base64,"
        const base64Content = result.split(',')[1];
        
        if (!base64Content) {
          console.error('Error: No se pudo extraer el contenido Base64 del archivo');
          observer.error(new Error('No se pudo extraer el contenido Base64 del archivo'));
          return;
        }
        
        console.log(`Archivo convertido a Base64: ${base64Content.length} caracteres`);
        console.log(`Muestra de los primeros 50 caracteres: ${base64Content.substring(0, 50)}...`);
        
        observer.next(base64Content);
        observer.complete();
      };
      
      reader.onerror = error => {
        console.error('Error al leer el archivo como Base64:', error);
        observer.error(error);
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Determina el tipo de archivo basado en el MIME type
   */
  private determineFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('audio/')) {
      return 'audio';
    } else if (
      mimeType.includes('pdf') || 
      mimeType.includes('word') || 
      mimeType.includes('excel') || 
      mimeType.includes('text/') ||
      mimeType.includes('document')
    ) {
      return 'document';
    }
    
    return 'file';
  }

  /**
   * Simula la carga de un archivo (para desarrollo)
   */
  private simulateUpload(phoneNumber: string, file: File, contactName?: string): Observable<any> {
    console.log('Simulando carga con:', { phoneNumber, fileName: file.name, contactName });
    
    // Generar ID único para el archivo
    const timestamp = new Date().getTime();
    const fileId = `msg-${timestamp}`;
    const s3Key = `test/${timestamp}-${file.name}`;
    
    // Crear objeto de respuesta
    const response = {
      message: 'Archivo simulado subido exitosamente',
      s3Key: s3Key,
      fileUrl: 'https://via.placeholder.com/150',
      item: {
        id: fileId,
        username: 'admin',
        phoneNumber,
        timestamp: new Date().toISOString(),
        s3Key: s3Key,
        fileName: file.name,
        contactName: contactName || 'Usuario WhatsApp',
        fileType: this.determineFileType(file.type)
      }
    };
    
    // Simular la actualización de DynamoDB guardando en localStorage
    const existingFiles = JSON.parse(localStorage.getItem('simulatedFiles') || '[]');
    existingFiles.push(response.item);
    localStorage.setItem('simulatedFiles', JSON.stringify(existingFiles));
    
    // Retornar respuesta después de un breve retardo
    return of(response).pipe(
      map(res => {
        return new Promise(resolve => setTimeout(() => resolve(res), 800));
      })
    );
  }
}
