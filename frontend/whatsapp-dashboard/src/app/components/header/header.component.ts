import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CognitoService } from '../../core/services/cognito.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  username: string = '';
  authProvider: string = 'Local';
  authProviderIcon: string = 'fa fa-user';
  private isBrowser: boolean;

  constructor(
    private router: Router,
    public authService: AuthService,
    private cognitoService: CognitoService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }
  
  ngOnInit(): void {
    this.checkAuthStatus();
  }
  
  private checkAuthStatus() {
    // Verificar autenticación y determinar el proveedor
    if (this.authService.isAuthenticated()) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        this.username = currentUser.username || 'Usuario';
        
        // Determinar el proveedor de autenticación
        // Verificamos si está en Cognito basado en atributos
        if (currentUser.attributes && currentUser.attributes['cognito:username']) {
          this.authProvider = 'Cognito';
          this.authProviderIcon = 'fa fa-aws';
        } else {
          this.authProvider = 'Local';
          this.authProviderIcon = 'fa fa-user';
        }
      }
    }
    
    // Verificar autenticación de Cognito como respaldo (solo en navegador)
    if (this.isBrowser) {
      this.cognitoService.getCurrentUser().subscribe({
        next: (user) => {
          if (user && user.username) {
            this.authProvider = 'Cognito';
            this.authProviderIcon = 'fa fa-aws';
            // Actualizar el nombre de usuario si está vacío
            if (!this.username) {
              this.username = user.username;
            }
          }
        },
        error: (error) => {
          console.error('Error al obtener usuario de Cognito:', error);
        }
      });
    }
  }
  
  logout(): void {
    console.log('Iniciando cierre de sesión desde header...');
    
    if (this.authProvider === 'Cognito' && this.isBrowser) {
      console.log('Cerrando sesión en Cognito...');
      this.cognitoService.signOut().subscribe({
        next: () => {
          console.log('Sesión de Cognito cerrada correctamente');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.error('Error al cerrar sesión en Cognito:', error);
          // Intentar el cierre de sesión estándar como fallback
          this.fallbackLogout();
        }
      });
    } else {
      this.fallbackLogout();
    }
  }
  
  private fallbackLogout(): void {
    console.log('Utilizando cierre de sesión estándar...');
    this.authService.logout().subscribe({
      next: () => {
        console.log('Sesión cerrada correctamente');
        this.username = '';
        this.authProvider = 'Local';
        this.authProviderIcon = 'fa fa-user';
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error en cierre de sesión estándar:', err);
        
        // Limpiar datos de sesión de todas formas
        this.username = '';
        this.authProvider = 'Local';
        this.authProviderIcon = 'fa fa-user';
        
        // Navegar a login
        this.router.navigate(['/login']);
      }
    });
  }
}
