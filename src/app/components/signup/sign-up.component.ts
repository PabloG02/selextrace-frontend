import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import {email, form, FormField, minLength, required, validate} from '@angular/forms/signals';

@Component({
  selector: 'app-signup',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    FormField,
  ],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  private readonly signUpFormModel = signal({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  readonly signUpForm = form(this.signUpFormModel, (schemaPath) => {
    required(schemaPath.username, {message: 'Username is required'});
    minLength(schemaPath.username, 2, {message: 'Username must be at least 2 characters'});

    required(schemaPath.email, {message: 'Email is required'});
    email(schemaPath.email, {message: 'Please enter a valid email address'});

    required(schemaPath.password, {message: 'Password is required'});
    minLength(schemaPath.password, 10, {message: 'Password must be at least 10 characters'});

    required(schemaPath.confirmPassword, {message: 'Please confirm your password'});

    validate(schemaPath.confirmPassword, ({value, valueOf}) => {
      const confirmPassword = value();
      const password = valueOf(schemaPath.password);

      if (confirmPassword !== password) {
        return {
          kind: 'passwordMismatch',
          message: 'Passwords do not match',
        };
      }

      return null;
    });
  });

  submit(event: Event): void {
    event.preventDefault();

    if (this.signUpForm().invalid()) {
      this.signUpForm().markAsTouched();
      return;
    }

    const value = this.signUpForm().value();
    this.authService.signup({
      username: value.username,
      email: value.email,
      password: value.password,
    }).subscribe({
      next: () => this.router.navigate(['/experiments']),
      error: (error) => {
        const message = error?.error?.message ?? 'Unable to create your account right now.';
        this.snackBar.open(message, 'Dismiss', { duration: 4000 });
      },
    });
  }
}
