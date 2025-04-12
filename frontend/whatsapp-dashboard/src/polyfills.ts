/**
 * Este archivo incluye polyfills necesarios para Angular y se carga antes de la aplicación.
 * Puedes agregar tus propios polyfills extra a este archivo.
 */

// Polyfill para el objeto global requerido por amazon-cognito-identity-js
(window as any).global = window;
(window as any).process = {
  env: { DEBUG: undefined },
  browser: true
}; 