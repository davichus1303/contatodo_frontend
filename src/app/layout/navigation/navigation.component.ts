import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

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
  constructor(private router: Router) {}

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
}
