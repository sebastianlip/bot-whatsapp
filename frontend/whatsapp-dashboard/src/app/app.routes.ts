import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { FileListComponent } from './dashboard/file-list/file-list.component';
import { AuthGuard } from './core/guards/auth.guard';
import { WhatsappSimulatorComponent } from './whatsapp-simulator/whatsapp-simulator.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'auth/login', component: LoginComponent },
  { path: 'dashboard', component: FileListComponent, canActivate: [AuthGuard] },
  {
    path: 'simulator',
    component: WhatsappSimulatorComponent,
    title: 'Simulador de WhatsApp'
  },
  { path: '**', redirectTo: '/dashboard' }
];
