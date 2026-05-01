import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ResetPasswordDialogData {
  userId: string;
  displayName: string;
}

@Component({
  selector: 'app-reset-password-dialog',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './reset-password-dialog.component.html',
  styleUrl: './reset-password-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordDialogComponent {
  readonly data = inject<ResetPasswordDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ResetPasswordDialogComponent>);

  readonly password = signal('');

  onSubmit(): void {
    if (this.password().trim()) {
      this.dialogRef.close(this.password);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
