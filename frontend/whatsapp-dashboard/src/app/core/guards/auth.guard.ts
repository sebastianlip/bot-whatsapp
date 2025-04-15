import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CognitoService } from '../services/cognito.service';
import { catchError, map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService, 
    private router: Router,
    private cognitoService: CognitoService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // Primero verificamos si hay autenticación local
    if (this.authService.isAuthenticated()) {
      return of(true);
    }
    
    // Si no hay autenticación local, verificamos con Cognito
    return this.cognitoService.isAuthenticated().pipe(
      map(isAuth => {
        if (isAuth) {
          return true;
        }
        // Si no está autenticado, redirigir al login
        this.router.navigate(['/login']);
        return false;
      }),
      catchError(error => {
        console.error('Error al verificar autenticación con Cognito:', error);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
} 