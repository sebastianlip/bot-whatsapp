import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    
    .content-container {
      flex: 1;
      padding: 20px;
      background-color: #f5f5f5;
    }
  `]
})
export class AppComponent {
  title = 'WhatsApp Dashboard';
}
