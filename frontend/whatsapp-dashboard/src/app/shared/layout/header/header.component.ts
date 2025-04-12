import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  username: string = '';
  
  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    // Obtener usuario actual si existe
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.username = currentUser.username;
    }
  }

  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
