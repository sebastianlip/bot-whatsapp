import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CognitoService } from '../../core/services/cognito.service';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div class="spinner"></div>
      <p>Validando autenticación...</p>
    </div>
    <style>
      .callback-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: Arial, sans-serif;
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-left-color: #25D366;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `
})
export class CallbackComponent implements OnInit {
  constructor(
    private router: Router,
    private cognitoService: CognitoService
  ) {}

  ngOnInit(): void {
    // Con el nuevo sistema, ya no necesitamos el callback de OAuth
    // Simplemente verificamos si el usuario está autenticado
    this.cognitoService.isAuthenticated().subscribe({
      next: (isAuthenticated) => {
        if (isAuthenticated) {
          // El usuario está autenticado, redirigir al dashboard
          this.router.navigate(['/dashboard']);
        } else {
          // No está autenticado, redirigir al login
          this.router.navigate(['/login']);
        }
      },
      error: (error) => {
        console.error('Error al verificar autenticación:', error);
        this.router.navigate(['/login'], { 
          queryParams: { error: 'auth_failed' } 
        });
      }
    });
  }
} 