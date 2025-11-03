import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  input,
  effect,
  inject,
  ElementRef,
  viewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
  AbstractControl,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-file-upload-dropzone',
  templateUrl: './file-upload-dropzone.component.html',
  styleUrl: './file-upload-dropzone.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: FileUploadDropzoneComponent,
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: FileUploadDropzoneComponent,
      multi: true,
    },
  ],
  imports: [MatIconModule, MatButtonModule],
})
export class FileUploadDropzoneComponent implements ControlValueAccessor, Validator {
  // Inputs
  accept = input<string>('');

  // Signals
  selectedFile = signal<File | null>(null);
  isDragOver = signal(false);
  isDisabled = signal(false);

  // View children
  fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  // Control value accessor callbacks
  private onChange: (value: File | null) => void = () => {};
  private onTouched: () => void = () => {};

  onContainerClick(): void {
    if (!this.isDisabled()) {
      this.fileInput().nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.updateFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isDisabled()) {
      this.isDragOver.set(true);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    if (this.isDisabled()) {
      return;
    }

    const file = event.dataTransfer?.files[0] || null;
    if (file && this.isValidFileType(file)) {
      this.updateFile(file);
    }
  }

  clearFile(event: Event): void {
    event.stopPropagation();
    this.updateFile(null);
    // Reset the file input
    this.fileInput().nativeElement.value = '';
  }

  private updateFile(file: File | null): void {
    this.selectedFile.set(file);
    this.onChange(file);
    this.onTouched();
  }

  private isValidFileType(file: File): boolean {
    const acceptTypes = this.accept();
    if (!acceptTypes) {
      return true;
    }

    const validTypes = acceptTypes.split(',').map(type => type.trim());
    return validTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      // Handle MIME types with wildcards (e.g., "image/*")
      if (type.includes('*')) {
        const pattern = type.replace('*', '.*');
        return new RegExp(pattern).test(file.type);
      }
      return file.type === type;
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // ControlValueAccessor implementation
  writeValue(value: File | null): void {
    this.selectedFile.set(value);
  }

  registerOnChange(fn: (value: File | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  // Validator implementation
  validate(control: AbstractControl): ValidationErrors | null {
    const file = control.value as File | null;

    if (!file) {
      return null;
    }

    // Validate file type if accept is specified
    if (!this.isValidFileType(file)) {
      return { invalidFileType: { acceptedTypes: this.accept(), actualType: file.type } };
    }

    return null;
  }
}
