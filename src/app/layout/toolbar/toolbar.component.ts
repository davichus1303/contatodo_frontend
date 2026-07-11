import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';

/**
 * Application toolbar component.
 */
@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Returns the current user name.
   *
   * @returns User name or empty string.
   */
  get userName(): string {
    const userInfo = this.authService.getUserInfo();
    return userInfo?.name || '';
  }

  /**
   * Logs out the current user.
   */
  logout(): void {
    this.authService.logout();
  }

  /**
   * Navigates to the sales page.
   */
  navigateToSales(): void {
    this.router.navigate(['/sales']);
  }
}
