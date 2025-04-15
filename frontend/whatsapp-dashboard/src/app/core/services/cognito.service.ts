import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { signIn, signOut, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { CognitoUser, UserData } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class CognitoService {
  private authenticationSubject: BehaviorSubject<boolean>;
  private currentUserSubject: BehaviorSubject<CognitoUser | null>;

  constructor() {
    this.authenticationSubject = new BehaviorSubject<boolean>(false);
    this.currentUserSubject = new BehaviorSubject<CognitoUser | null>(null);
    this.initAuth();
  }

  private initAuth(): void {
    try {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: environment.cognito.userPoolId,
            userPoolClientId: environment.cognito.clientId,
            loginWith: {
              oauth: {
                domain: environment.cognito.domain,
                scopes: ['email', 'openid', 'profile'],
                redirectSignIn: [environment.cognito.redirectUri],
                redirectSignOut: [environment.cognito.logoutUri],
                responseType: 'code'
              }
            }
          }
        }
      });
      console.log('Amplify configurado correctamente');
    } catch (error) {
      console.error('Error al configurar Amplify:', error);
    }
  }

  public performSignIn(username: string, password: string): Observable<CognitoUser> {
    return from(signIn({ username, password })).pipe(
      switchMap((signInOutput) => {
        const user = signInOutput.isSignedIn 
          ? { username, signInUserSession: { idToken: { jwtToken: 'token-simulado' } } } 
          : { username };
        
        this.currentUserSubject.next(user);
        this.authenticationSubject.next(signInOutput.isSignedIn);
        
        return of(user);
      }),
      catchError(error => {
        console.error('Error de inicio de sesión:', error);
        return of({ username: '', error: error.message } as unknown as CognitoUser);
      })
    );
  }

  public signOut(): Observable<any> {
    return from(signOut()).pipe(
      tap(() => {
        this.authenticationSubject.next(false);
        this.currentUserSubject.next(null);
      }),
      catchError(error => {
        console.error('Error al cerrar sesión:', error);
        return of(error);
      })
    );
  }

  public isAuthenticated(): Observable<boolean> {
    return this.authenticationSubject.asObservable();
  }

  public getCurrentUser(): Observable<CognitoUser | null> {
    return from(getCurrentUser()).pipe(
      switchMap((user: any) => {
        return from(fetchUserAttributes()).pipe(
          map(attributes => {
            const cognitoUser: CognitoUser = {
              username: user.username,
              attributes: attributes
            };
            this.currentUserSubject.next(cognitoUser);
            this.authenticationSubject.next(true);
            return cognitoUser;
          })
        );
      }),
      catchError(error => {
        console.error('Error al obtener usuario actual:', error);
        return of(null);
      })
    );
  }

  public getUserData(): Observable<UserData> {
    return this.getCurrentUser().pipe(
      map((user: CognitoUser | null): UserData => {
        if (!user) {
          return {
            username: '',
            isAuthenticated: false
          };
        }
        
        return {
          username: user.username,
          isAuthenticated: true,
          attributes: user.attributes,
          token: user.signInUserSession?.idToken?.jwtToken
        };
      }),
      catchError(error => {
        console.error('Error al obtener datos de usuario:', error);
        return of({
          username: '',
          isAuthenticated: false
        });
      })
    );
  }
} 