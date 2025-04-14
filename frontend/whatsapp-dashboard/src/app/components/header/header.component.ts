import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  username: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    // Obtener el usuario actual
    this.updateUsername();
    
    // Suscribirse a cambios en el usuario
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.username = user.username;
      } else {
        this.username = '';
      }
    });
  }

  /**
   * Actualiza el nombre de usuario desde el servicio de autenticación
   */
  updateUsername(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.username = currentUser.username;
    }
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    // Confirmar cierre de sesión
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
      this.authService.logout().subscribe({
        next: () => {
          console.log('Sesión cerrada exitosamente');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('Error al cerrar sesión:', err);
        }
      });
    }
  }
}
