import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '@core/i18n/i18n.service';

/**
 * Page shown when an authenticated user tries to access a module without
 * permission.
 */
@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './access-denied.component.html',
  styleUrls: ['./access-denied.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccessDeniedComponent {
  readonly i18nService = inject(I18nService);
  private readonly router = inject(Router);

  /**
   * Navigates to the sales module (application home).
   */
  goHome(): void {
    this.router.navigate(['/sales']);
  }
}