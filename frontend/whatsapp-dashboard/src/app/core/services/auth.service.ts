import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, tap, catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { CognitoService } from './cognito.service';
import { UserData, CognitoUser } from '../models/user';
import { Hub } from 'aws-amplify/utils';
import * as AuthAPI from 'aws-amplify/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<UserData | null>;
  public currentUser$: Observable<UserData | null>;
  private platformId = inject(PLATFORM_ID);
  private isBrowser: boolean;
  private isInitialized = false;
  private currentUser: any = null;
  private phoneNumbers: string[] = [];
  private authState = new BehaviorSubject<boolean>(false);
  authState$ = this.authState.asObservable();

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

  constructor(
    private router: Router,
    private cognitoService: CognitoService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    console.log('AuthService: Inicializando servicio de autenticación');
    
    // Intentar recuperar usuario del localStorage solo si estamos en el navegador
    if (this.isBrowser) {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          this.currentUser = JSON.parse(savedUser);
          console.log('AuthService: Usuario recuperado del almacenamiento local');
        }
      } catch (error) {
        console.error('Error al parsear el usuario del localStorage:', error);
        if (this.isBrowser) {
          localStorage.removeItem('currentUser');
        }
      }
    }

    this.currentUserSubject = new BehaviorSubject<UserData | null>(this.currentUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
    
    // Comprobar estado actual de autenticación
    this.updateAuthenticationState();

    // Escuchar eventos de cambio de autenticación de Amplify
    Hub.listen('auth', (data) => {
      const { payload } = data;
      console.log('AuthService: Evento de autenticación recibido:', payload.event);
      
      if (payload.event === 'signedIn') {
        console.log('AuthService: Usuario ha iniciado sesión');
        this.updateAuthenticationState();
      } else if (payload.event === 'signedOut') {
        console.log('AuthService: Usuario ha cerrado sesión');
        if (this.isBrowser) {
          localStorage.removeItem('currentUser');
        }
        this.currentUser = null;
        this.phoneNumbers = [];
        this.authState.next(false);
      }
    });
  }
  
  /**
   * Actualiza el estado de autenticación basado en la sesión actual
   */
  async updateAuthenticationState(): Promise<void> {
    try {
      const user = await AuthAPI.getCurrentUser();
      this.currentUser = user;
      
      // Guardar usuario en localStorage para recuperación rápida solo si estamos en el navegador
      if (this.isBrowser && user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
      
      // Obtener números de teléfono si el usuario está autenticado
      if (user) {
        await this.fetchUserPhoneNumbers();
      }
      
      this.authState.next(!!user);
      console.log('AuthService: Estado de autenticación actualizado, usuario autenticado:', !!user);
    } catch (error) {
      console.error('AuthService: Error al verificar estado de autenticación:', error);
      this.authState.next(false);
    } finally {
      this.isInitialized = true;
      console.log('AuthService: Inicialización completada');
    }
  }

  /**
   * Verifica si el servicio de autenticación está inicializado
   */
  isInitializedService(): boolean {
    return this.isInitialized;
  }

  /**
   * Obtiene los números de teléfono de un usuario del mock
   * (temporal hasta implementar la consulta a DynamoDB)
   */
  private getPhoneNumbersFromMock(username: string): string[] {
    const mockUser = this.MOCK_USERS.find(u => u.username === username);
    return mockUser?.phoneNumbers || [];
  }

  /**
   * Iniciar sesión con usuario y contraseña
   */
  login(username: string, password: string): Observable<any> {
    console.log('AuthService: Intentando autenticar usuario', username);

    // Intentar primero con Cognito
    return this.cognitoService.performSignIn(username, password).pipe(
      switchMap(cognitoUserResult => {
        console.log('Respuesta de Cognito:', cognitoUserResult);
        
        // Si el resultado es nulo o no tiene username, manejamos el error
        if (!cognitoUserResult || !cognitoUserResult.username) {
          return throwError(() => new Error('Error en la autenticación con Cognito'));
        }
        
        // Crear objeto de usuario autenticado
        const userData: UserData = {
          username: cognitoUserResult.username,
          isAuthenticated: true,
          attributes: {},
          // Buscar números de teléfono asociados (temporal)
          phoneNumbers: this.getPhoneNumbersFromMock(username)
        };
        
        // Guardar en localStorage si estamos en el navegador
        if (this.isBrowser) {
          localStorage.setItem('currentUser', JSON.stringify(userData));
        }
        
        // Actualizar el BehaviorSubject
        this.currentUserSubject.next(userData);
        this.isInitialized = true;
        
        // Retornar respuesta exitosa
        return of({
          success: true,
          message: 'Login exitoso con Cognito',
          user: userData
        });
      }),
      catchError(error => {
        console.error('Error al iniciar sesión con Cognito:', error);
        
        // Falló Cognito, intentar con el método de mock como fallback
        console.log('Fallback: Intentando con método mock...');
        return this.loginWithMockSystem(username, password);
      })
    );
  }
  
  /**
   * Método de fallback que usa el sistema mock para autenticación
   */
  private loginWithMockSystem(username: string, password: string): Observable<any> {
    // Buscar usuario en la lista de usuarios mock
    const user = this.MOCK_USERS.find(u => 
      u.username.toLowerCase() === username.toLowerCase() && 
      u.password === password
    );

    if (user) {
      console.log('AuthService: Usuario encontrado en sistema mock, autenticación exitosa');
      
      // Crear objeto de usuario autenticado
      const userData: UserData = {
        username: user.username,
        isAuthenticated: true,
        attributes: user.attributes,
        phoneNumbers: user.phoneNumbers
      };

      // Guardar en localStorage si estamos en el navegador
      if (this.isBrowser) {
        localStorage.setItem('currentUser', JSON.stringify(userData));
      }
      
      // Actualizar el BehaviorSubject
      this.currentUserSubject.next(userData);
      this.isInitialized = true;

      // Simular la creación de asociaciones usuario-teléfono en DynamoDB
      console.log(`Asociando usuario ${user.username} con números:`, user.phoneNumbers);

      // Retornar respuesta exitosa
      return of({
        success: true,
        message: 'Login exitoso (sistema interno)',
        user: userData
      }).pipe(
        delay(500) // Simular retraso de red
      );
    } else {
      console.error('AuthService: Credenciales inválidas');
      this.isInitialized = true;
      // Retornar error
      return of({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      }).pipe(
        delay(500), // Simular retraso de red
        switchMap(() => {
          return throwError(() => new Error('Usuario o contraseña incorrectos'));
        })
      );
    }
  }

  /**
   * Cerrar sesión
   */
  logout(): Observable<any> {
    // Intentar cerrar sesión con Cognito primero
    return this.cognitoService.signOut().pipe(
      tap(() => {
        // Limpiar localStorage si estamos en el navegador
        if (this.isBrowser) {
          localStorage.removeItem('currentUser');
        }
        
        // Actualizar el BehaviorSubject
        this.currentUserSubject.next(null);
      }),
      catchError(error => {
        console.error('Error al cerrar sesión con Cognito:', error);
        
        // Si falla Cognito, al menos limpiamos el estado local
        if (this.isBrowser) {
          localStorage.removeItem('currentUser');
        }
        
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
        
        return of({ success: true });
      })
    );
  }

  /**
   * Verifica si el usuario está autenticado actualmente
   */
  isAuthenticated(): boolean {
    // Si el servicio no está inicializado, devolver false
    if (!this.isInitialized) {
      console.log('AuthService: isAuthenticated llamado antes de inicialización');
      return false;
    }

    // Comprobar si tenemos un usuario en memoria
    if (this.currentUser) {
      return true;
    }

    // Comprobar si hay un usuario en localStorage como respaldo, solo si estamos en el navegador
    if (this.isBrowser) {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          this.currentUser = JSON.parse(savedUser);
          return true;
        }
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Obtener datos del usuario actual
   */
  getCurrentUser(): UserData | null {
    // Si el servicio no está inicializado, intentar obtener de localStorage solo si estamos en el navegador
    if (!this.isInitialized && this.isBrowser) {
      try {
        const userJson = localStorage.getItem('currentUser');
        if (userJson) {
          const userData = JSON.parse(userJson) as UserData;
          return userData;
        }
      } catch (e) {
        console.error('Error al recuperar usuario del localStorage:', e);
        return null;
      }
    }
    
    return this.currentUserSubject.value;
  }

  /**
   * Obtener los números de teléfono asociados al usuario actual
   */
  getUserPhoneNumbers(): string[] {
    const currentUser = this.getCurrentUser();
    return currentUser?.phoneNumbers || [];
  }

  /**
   * Verificar si el usuario tiene permiso para ver archivos de un número específico
   */
  canAccessPhoneNumber(phoneNumber: string): boolean {
    const currentUser = this.getCurrentUser();
    
    // Si no hay usuario, no tiene acceso
    if (!currentUser) return false;
    
    // El admin tiene acceso a todo
    if (currentUser.username === 'admin' || 
        (currentUser.attributes && currentUser.attributes['role'] === 'admin')) {
      return true;
    }
    
    // Verificar si el número está entre los asociados al usuario
    return currentUser.phoneNumbers?.includes(phoneNumber) || false;
  }

  private async fetchUserPhoneNumbers(): Promise<void> {
    try {
      // Usamos getUserData de CognitoService en lugar de un método inexistente
      this.cognitoService.getUserData().subscribe(userData => {
        // Asumimos que los números telefónicos están en el mock o pueden obtenerse de alguna manera
        if (userData && userData.phoneNumbers) {
          this.phoneNumbers = userData.phoneNumbers;
        } else {
          // Fallback a mock de números telefónicos si es necesario
          this.phoneNumbers = this.getPhoneNumbersFromMock(userData.username);
        }
      });
    } catch (error) {
      console.error('Error al obtener números de teléfono:', error);
      this.phoneNumbers = [];
    }
  }
}
