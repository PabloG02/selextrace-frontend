import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import {email, form, FormField, required} from '@angular/forms/signals';

@Component({
  selector: 'app-login',
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
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  private readonly signInFormModel = signal({
    email: '',
    password: '',
  });

  // Construct the signal form with validations
  readonly signInForm = form(this.signInFormModel, (schemaPath) => {
    required(schemaPath.email, { message: 'Email is required' });
    email(schemaPath.email, { message: 'Please enter a valid email' });

    required(schemaPath.password, { message: 'Password is required' });
  });

  submit(event: Event): void {
    event.preventDefault();

    if (this.signInForm().invalid()) {
      this.signInForm().markAsTouched();
      return;
    }

    // Pass the raw signal value to the auth service
    this.authService.login(this.signInForm().value()).subscribe({
      next: () => {
        this.router.navigate(['/experiments']);
      },
      error: (error) => {
        const message = error?.error?.message ?? 'Unable to sign in with those credentials.';
        this.snackBar.open(message, 'Dismiss', { duration: 4000 });
      },
    });
  }
}
