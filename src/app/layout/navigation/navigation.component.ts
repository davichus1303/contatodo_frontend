import { Component, inject } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { I18nService } from '../../shared/utils/i18n.util';

/**
 * Application navigation component.
 */
@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    MatSidenavModule,
    MatListModule,
    MatIconModule
  ],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {
  private readonly router = inject(Router);
  readonly i18nService = inject(I18nService);

  /**
   * Navigates to the sales page.
   */
  navigateToSales(): void {
    this.router.navigate(['/sales']);
  }

  /**
   * Navigates to the products page.
   */
  navigateToProducts(): void {
    this.router.navigate(['/products']);
  }

  /**
   * Navigates to the acquisitions page.
   */
  navigateToAcquisitions(): void {
    this.router.navigate(['/acquisitions']);
  }

  /**
   * Navigates to the acquisition type catalog page.
   */
  navigateToAcquisitionTypeCatalog(): void {
    this.router.navigate(['/acquisition-type-catalog']);
  }
}
