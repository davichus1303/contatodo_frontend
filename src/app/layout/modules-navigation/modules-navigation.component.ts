import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';
import { ModulesService } from '../../features/modules/modules.service';
import { Module } from '../../shared/models/module.model';
import { Router } from '@angular/router';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { I18nService } from '../../shared/utils/i18n.util';

/**
 * Modules navigation component displayed at the top of authenticated pages.
 */
@Component({
  selector: 'app-modules-navigation',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './modules-navigation.component.html',
  styleUrls: ['./modules-navigation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulesNavigationComponent {
  readonly authService = inject(AuthService);
  readonly modulesService = inject(ModulesService);
  readonly router = inject(Router);
  readonly i18nService = inject(I18nService);

  modules = signal<Module[]>([]);
  isLoading = signal<boolean>(false);
  menuOpen = signal<boolean>(false);

  /**
   * Opens the modules menu and loads modules if not already loaded.
   */
  openMenu(): void {
    if (this.modules().length === 0 && !this.isLoading()) {
      this.loadModules();
    }
    this.menuOpen.set(true);
  }

  /**
   * Loads modules from the backend.
   */
  private loadModules(): void {
    this.isLoading.set(true);
    this.modulesService.getModules().subscribe({
      next: (response: ApiResponse<Module[]>) => {
        if (response.status === 200 && response.data) {
          this.modules.set(response.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Navigates to the specified module route.
   *
   * @param link Module route.
   */
  navigateToModule(link: string): void {
    this.router.navigate([link]);
    this.menuOpen.set(false);
  }

  /**
   * Logs out the current user.
   */
  logout(): void {
    this.authService.logout();
  }
}
