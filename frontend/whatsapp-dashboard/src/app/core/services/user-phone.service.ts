import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserPhoneService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Obtener los números de teléfono asociados a un usuario
   * @param username Nombre de usuario
   */
  getUserPhoneNumbers(username: string): Observable<string[]> {
    // Crear headers para la petición
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getIdToken()}`
    });

    // Llamar a la API para obtener los números asociados
    return this.http.post<any>(`${this.apiUrl}/user-phones`, { username }, { headers })
      .pipe(
        map(response => {
          if (response && response.phoneNumbers) {
            console.log(`Números de teléfono obtenidos para ${username}:`, response.phoneNumbers);
            return response.phoneNumbers;
          }
          console.warn('No se recibieron números de teléfono');
          return [];
        }),
        catchError(error => {
          console.error('Error al obtener números de teléfono:', error);
          
          // En caso de error, devolver datos mock como fallback
          return this.getFallbackPhoneNumbers(username);
        })
      );
  }

  /**
   * Asociar un número de teléfono a un usuario
   * @param username Nombre de usuario
   * @param phoneNumber Número de teléfono
   */
  associatePhoneNumber(username: string, phoneNumber: string): Observable<any> {
    // Crear headers para la petición
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getIdToken()}`
    });

    // Llamar a la API para asociar el número
    return this.http.post<any>(`${this.apiUrl}/associate-phone`, { 
      username, 
      phoneNumber 
    }, { headers })
      .pipe(
        catchError(error => {
          console.error('Error al asociar número de teléfono:', error);
          return of({ success: false, error: error.message });
        })
      );
  }

  /**
   * Desasociar un número de teléfono de un usuario
   * @param username Nombre de usuario
   * @param phoneNumber Número de teléfono
   */
  disassociatePhoneNumber(username: string, phoneNumber: string): Observable<any> {
    // Crear headers para la petición
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getIdToken()}`
    });

    // Llamar a la API para desasociar el número
    return this.http.post<any>(`${this.apiUrl}/disassociate-phone`, { 
      username, 
      phoneNumber 
    }, { headers })
      .pipe(
        catchError(error => {
          console.error('Error al desasociar número de teléfono:', error);
          return of({ success: false, error: error.message });
        })
      );
  }

  /**
   * Obtener token ID de Cognito
   */
  private getIdToken(): string {
    // Intentar obtener el token del nuevo formato (Cognito)
    try {
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        const userData = JSON.parse(currentUser);
        if (userData.token) {
          return userData.token;
        }
      }
    } catch (error) {
      console.error('Error al leer token de currentUser:', error);
    }

    // Si no se encuentra en el nuevo formato, intentar con el formato antiguo
    return localStorage.getItem('id_token') || '';
  }

  /**
   * Datos de fallback para desarrollo y testing
   */
  private getFallbackPhoneNumbers(username: string): Observable<string[]> {
    console.log('Usando datos de fallback para números de teléfono');
    
    // Datos mock según el usuario
    if (username === 'admin') {
      return of([]);  // El admin no tiene restricciones
    } else if (username === 'usuario1') {
      return of(['+5491122334455', '+5493512347050']);
    } else if (username === 'usuario2') {
      return of(['+5491133445566', '+5493512347051']);
    } else if (username === 'usuario3') {
      return of(['+5491144556677']);
    }
    
    return of([]);
  }
} 