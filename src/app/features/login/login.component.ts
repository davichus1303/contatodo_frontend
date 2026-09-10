import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { LoginRequest } from '@core/application/dto/login-request.dto';
import { LOGIN_CONSTANTS } from '@shared/constants/login.constants';
import { I18nService } from '@core/i18n/i18n.service';
import { domainEmail } from '@shared/validators/domain.validators';

/**
 * Login page component.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  loginForm: FormGroup;
  readonly isLoading = signal<boolean>(false);
  readonly hidePassword = signal<boolean>(true);
  readonly i18nService = inject(I18nService);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notifications: NotificationService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, domainEmail()]],
      password: ['', [Validators.required]]
    });
  }

  /**
   * Handles login form submission.
   */
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const request: LoginRequest = {
      email: this.loginForm.get('email')?.value,
      password: this.loginForm.get('password')?.value
    };

    this.authService.login(request.email, request.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/sales']);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.notifications.error(
          extractApiErrorMessage(error, LOGIN_CONSTANTS.MESSAGES.LOGIN_FAILED)
        );
      }
    });
  }

  /**
   * Toggles password visibility.
   */
  togglePasswordVisibility(): void {
    this.hidePassword.update(current => !current);
  }
}
