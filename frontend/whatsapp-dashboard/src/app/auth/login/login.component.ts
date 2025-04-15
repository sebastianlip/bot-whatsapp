import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { CognitoService } from '../../core/services/cognito.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  errorMessage = '';
  errorFromParams = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private cognitoService: CognitoService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Comprobar si hay errores en los parámetros de la URL
    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        this.errorFromParams = true;
        if (params['error'] === 'auth_failed') {
          this.errorMessage = 'No se pudo completar la autenticación. Por favor, inténtelo de nuevo.';
        }
      }
    });

    // Redirigir si el usuario ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const { username, password } = this.loginForm.value;
    
    // Usar el nuevo servicio de Cognito
    this.cognitoService.performSignIn(username, password)
      .subscribe({
        next: (cognitoUser) => {
          if (cognitoUser && cognitoUser.username) {
            console.log('Inicio de sesión exitoso con Cognito');
            this.router.navigate(['/dashboard']);
          } else {
            this.tryLocalAuthentication(username, password);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error durante el inicio de sesión con Cognito:', error);
          this.tryLocalAuthentication(username, password);
        }
      });
  }

  private tryLocalAuthentication(username: string, password: string): void {
    this.authService.login(username, password)
      .subscribe({
        next: (response) => {
          console.log('Respuesta de autenticación local:', response);
          
          if (response.success) {
            console.log('Inicio de sesión exitoso con sistema local');
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage = response.message || 'Error durante el inicio de sesión';
            console.error('Error en login local:', this.errorMessage);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error durante el inicio de sesión local:', error);
          this.errorMessage = error.message || 'Error durante el inicio de sesión';
          this.loading = false;
        }
      });
  }
}
