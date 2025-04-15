import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileListComponent } from './file-list/file-list.component';
import { FileService } from '../core/services/file.service';
import { AuthService } from '../core/services/auth.service';
import { timer } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FileListComponent],
  template: `
    <div class="container mx-auto p-4">
      <!-- Componente lista de archivos -->
      <app-file-list></app-file-list>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit {
  constructor(
    private fileService: FileService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Esperar un momento para asegurar que la autenticación esté completa
    // antes de intentar cargar los archivos
    timer(500).subscribe(() => {
      // Verificar que el usuario esté autenticado
      if (this.authService.isAuthenticated()) {
        console.log('Dashboard: Usuario autenticado, iniciando precarga de archivos');
        this.fileService.clearFilesCache(); // Limpiar caché para forzar carga fresca
        this.fileService.getAllFiles().subscribe({
          next: files => {
            console.log(`Dashboard: ${files.length} archivos precargados correctamente`);
          },
          error: err => {
            console.error('Error en precarga de archivos:', err);
          }
        });
      } else {
        console.warn('Dashboard: Usuario no autenticado, omitiendo precarga');
      }
    });
  }
} 