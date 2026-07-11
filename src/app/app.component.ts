import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModulesNavigationComponent } from './layout/modules-navigation/modules-navigation.component';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ModulesNavigationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'contatodo_web';
  authService = inject(AuthService);
}
