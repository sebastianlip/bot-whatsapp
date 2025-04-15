import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  constructor() {}

  /**
   * Registra un mensaje informativo
   */
  log(message: string, source?: string): void {
    if (!environment.production) {
      console.log(`[INFO]${source ? ` [${source}]` : ''}: ${message}`);
    }
  }

  /**
   * Registra un mensaje de advertencia
   */
  warn(message: string, source?: string): void {
    if (!environment.production) {
      console.warn(`[WARNING]${source ? ` [${source}]` : ''}: ${message}`);
    }
  }

  /**
   * Registra un mensaje de error
   */
  error(message: string, error?: any, source?: string): void {
    console.error(`[ERROR]${source ? ` [${source}]` : ''}: ${message}`);
    if (error && !environment.production) {
      console.error(error);
    }
  }

  /**
   * Registra un mensaje de depuración
   */
  debug(message: string, data?: any, source?: string): void {
    if (!environment.production) {
      console.debug(`[DEBUG]${source ? ` [${source}]` : ''}: ${message}`);
      if (data) {
        console.debug(data);
      }
    }
  }
} 