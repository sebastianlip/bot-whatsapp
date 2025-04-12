import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// Servicios y proveedores
import { AuthService } from '../core/services/auth.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  providers: [
    AuthService
  ]
})
export class AuthModule { }
