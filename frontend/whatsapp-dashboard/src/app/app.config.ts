import { ApplicationConfig, importProvidersFrom, APP_INITIALIZER, PLATFORM_ID, inject } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { isPlatformBrowser } from '@angular/common';
import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { environment } from '../environments/environment';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';

// Función para inicializar Amplify
export function initializeAmplify() {
  const platformId = inject(PLATFORM_ID);
  
  return () => {
    console.log('Inicializando Amplify v6 desde APP_INITIALIZER');
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
      
      // Solo configurar el proveedor de tokens si estamos en el navegador
      if (isPlatformBrowser(platformId)) {
        // Configurar proveedor de tokens
        cognitoUserPoolsTokenProvider.setKeyValueStorage({
          setItem: (key: string, value: string) => {
            try {
              localStorage.setItem(key, value);
              return Promise.resolve();
            } catch (error) {
              return Promise.reject(error);
            }
          },
          getItem: (key: string) => {
            try {
              const value = localStorage.getItem(key);
              return Promise.resolve(value);
            } catch (error) {
              return Promise.reject(error);
            }
          },
          removeItem: (key: string) => {
            try {
              localStorage.removeItem(key);
              return Promise.resolve();
            } catch (error) {
              return Promise.reject(error);
            }
          },
          clear: () => {
            try {
              localStorage.clear();
              return Promise.resolve();
            } catch (error) {
              return Promise.reject(error);
            }
          }
        });
      }
      
      return Promise.resolve(true);
    } catch (error) {
      console.error('Error al configurar Amplify:', error);
      return Promise.resolve(false);
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withRouterConfig({ 
        onSameUrlNavigation: 'reload'  // Permitir navegar a la misma URL
      })
    ),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    provideAnimations(),
    MessageService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAmplify,
      multi: true
    }
  ]
};
