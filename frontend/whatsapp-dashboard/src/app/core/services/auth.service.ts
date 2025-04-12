import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

interface UserData {
  username: string;
  isAuthenticated: boolean;
  attributes: {
    [key: string]: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<UserData | null>;
  public currentUser$: Observable<UserData | null>;
  private platformId = inject(PLATFORM_ID);

  // Simulación de credenciales de usuario
  private readonly MOCK_USERS = [
    {
      username: 'admin',
      password: 'Password123!',
      attributes: {
        'email': 'admin@example.com',
        'phone_number': '+14155551234'
      }
    }
  ];

  constructor(private router: Router) {
    // Obtener usuario del localStorage si existe y estamos en el navegador
    let savedUser = null;
    try {
      if (isPlatformBrowser(this.platformId)) {
        const userJson = localStorage.getItem('currentUser');
        if (userJson) {
          savedUser = JSON.parse(userJson);
        }
      }
    } catch (error) {
      console.error('Error obteniendo usuario del localStorage', error);
    }

    this.currentUserSubject = new BehaviorSubject<UserData | null>(savedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  /**
   * Iniciar sesión con usuario y contraseña
   */
  login(username: string, password: string): Observable<any> {
    console.log('AuthService: Intentando autenticar usuario', username);

    // Buscar usuario en la lista de usuarios mock
    const user = this.MOCK_USERS.find(u => 
      u.username.toLowerCase() === username.toLowerCase() && 
      u.password === password
    );

    if (user) {
      console.log('AuthService: Usuario encontrado, autenticación exitosa');
      
      // Crear objeto de usuario autenticado
      const userData: UserData = {
        username: user.username,
        isAuthenticated: true,
        attributes: user.attributes
      };

      // Guardar en localStorage si estamos en el navegador
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('currentUser', JSON.stringify(userData));
      }
      
      // Actualizar el BehaviorSubject
      this.currentUserSubject.next(userData);

      // Retornar respuesta exitosa
      return of({
        success: true,
        message: 'Login exitoso',
        user: userData
      }).pipe(
        delay(500) // Simular retraso de red
      );
    } else {
      console.error('AuthService: Credenciales inválidas');
      // Retornar error
      return of({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      }).pipe(
        delay(500), // Simular retraso de red
        tap(() => {
          throw new Error('Usuario o contraseña incorrectos');
        })
      );
    }
  }

  /**
   * Cerrar sesión
   */
  logout(): Observable<any> {
    // Limpiar localStorage si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentUser');
    }
    
    // Actualizar el BehaviorSubject
    this.currentUserSubject.next(null);
    
    return of({ success: true }).pipe(
      tap(() => this.router.navigate(['/auth/login']))
    );
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    const currentUser = this.currentUserSubject.value;
    return !!currentUser && currentUser.isAuthenticated;
  }

  /**
   * Obtener datos del usuario actual
   */
  getCurrentUser(): UserData | null {
    return this.currentUserSubject.value;
  }
}
