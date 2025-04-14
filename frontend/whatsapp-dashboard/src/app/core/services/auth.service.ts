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
  phoneNumbers?: string[]; // Números de teléfono asociados al usuario
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
        'phone_number': '+14155551234',
        'role': 'admin'
      },
      // El admin puede ver todos los números
      phoneNumbers: [] 
    },
    {
      username: 'usuario1',
      password: 'Password123!',
      attributes: {
        'email': 'usuario1@example.com',
        'phone_number': '+5491122334455',
        'role': 'user'
      },
      // Usuario 1 solo puede ver archivos de estos números
      phoneNumbers: ['+5491122334455', '+5493512347050'] 
    },
    {
      username: 'usuario2',
      password: 'Password123!',
      attributes: {
        'email': 'usuario2@example.com',
        'phone_number': '+5491133445566',
        'role': 'user'
      },
      // Usuario 2 solo puede ver archivos de estos números
      phoneNumbers: ['+5491133445566', '+5493512347051'] 
    },
    {
      username: 'usuario3',
      password: 'Password123!',
      attributes: {
        'email': 'usuario3@example.com',
        'phone_number': '+5491144556677',
        'role': 'user'
      },
      // Usuario 3 solo puede ver archivos de este número
      phoneNumbers: ['+5491144556677'] 
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
        attributes: user.attributes,
        phoneNumbers: user.phoneNumbers
      };

      // Guardar en localStorage si estamos en el navegador
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('currentUser', JSON.stringify(userData));
      }
      
      // Actualizar el BehaviorSubject
      this.currentUserSubject.next(userData);

      // Simular la creación de asociaciones usuario-teléfono en DynamoDB
      console.log(`Asociando usuario ${user.username} con números:`, user.phoneNumbers);

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
      tap(() => this.router.navigate(['/login']))
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

  /**
   * Obtener los números de teléfono asociados al usuario actual
   */
  getUserPhoneNumbers(): string[] {
    const currentUser = this.currentUserSubject.value;
    return currentUser?.phoneNumbers || [];
  }

  /**
   * Verificar si el usuario tiene permiso para ver archivos de un número específico
   */
  canAccessPhoneNumber(phoneNumber: string): boolean {
    const currentUser = this.currentUserSubject.value;
    
    // Si no hay usuario, no tiene acceso
    if (!currentUser) return false;
    
    // El admin tiene acceso a todo
    if (currentUser.username === 'admin' || 
        currentUser.attributes['role'] === 'admin') {
      return true;
    }
    
    // Verificar si el número está entre los asociados al usuario
    return currentUser.phoneNumbers?.includes(phoneNumber) || false;
  }
}
