import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

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

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
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
    console.log('Formulario enviado');
    console.log('Estado del formulario:', this.loginForm.value);
    console.log('Formulario válido:', this.loginForm.valid);
    
    if (this.loginForm.invalid) {
      console.error('Formulario inválido, campos con error:', {
        username: this.loginForm.get('username')?.errors,
        password: this.loginForm.get('password')?.errors
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const { username, password } = this.loginForm.value;

    // Para depuración - datos fijos
    console.log('Intentando iniciar sesión con:', username, password);
    
    // Mostrar alerta para verificar que la función se está ejecutando
    alert('Iniciando sesión... Revisa la consola para más detalles.');
    
    this.authService.login(username, password)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage = response.message || 'Error durante el inicio de sesión';
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error durante el inicio de sesión:', error);
          this.errorMessage = error.message || 'Error durante el inicio de sesión';
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        }
      });
  }
}
