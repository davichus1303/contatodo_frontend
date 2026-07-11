import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LoginRequest } from '../../shared/dto/login-request.dto';
import { LOGIN_CONSTANTS } from '../../shared/constants/login.constants';
import { GENERAL_CONSTANTS } from '../../shared/constants/general.constants';

/**
 * Login page component.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
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

    this.isLoading = true;

    const request: LoginRequest = {
      email: this.loginForm.get('email')?.value,
      password: this.loginForm.get('password')?.value
    };

    this.authService.login(request.email, request.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/sales']);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.snackBar.open(
          error.error && typeof error.error === 'object' && 'message' in error.error
            ? String((error.error as { message?: string }).message)
            : LOGIN_CONSTANTS.MESSAGES.LOGIN_FAILED,
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
      }
    });
  }

  /**
   * Toggles password visibility.
   */
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }
}
