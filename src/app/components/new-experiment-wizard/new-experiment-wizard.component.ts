import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { ExperimentsStore } from '../../stores/experiments.store';
import { FileFormat, ReadType } from '../../models/experiment';
import { ProgressDialogComponent } from '../shared/progress-dialog.component';
import { FileUploadDropzoneComponent } from '../shared/file-upload-dropzone/file-upload-dropzone.component';
import { catchError, of } from 'rxjs';
import {CreateExperimentDto, SelectionCycle} from '../../models/create-experiment-dto';

type CycleFormGroup = FormGroup<{
  roundNumber: FormControl<number>;
  roundName: FormControl<string>;
  forwardFiles: FormControl<File | null>;
  reverseFiles: FormControl<File | null>;
  isControl: FormControl<boolean>;
  isCounterSelection: FormControl<boolean>;
}>;

/**
 * Wizard component for creating new SELEX experiments.
 * Guides users through a multistep process to configure experiment details,
 * primers, randomized regions, and selection cycles.
 */
@Component({
  selector: 'app-new-experiment-wizard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatStepperModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    DragDropModule,
    MatChipsModule,
    MatSnackBarModule,
    TitleCasePipe,
    FileUploadDropzoneComponent,
  ],
  templateUrl: './new-experiment-wizard.component.html',
  styleUrl: './new-experiment-wizard.component.scss',
})
export class NewExperimentWizardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly experimentsStore = inject(ExperimentsStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  private readonly stepper = viewChild(MatStepper);

  /** Form group for general experiment information and sequencing settings */
  readonly generalForm = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', {
      validators: [Validators.required, this.uniqueExperimentNameValidator()],
    }),
    description: this.fb.nonNullable.control(''),
    isDemultiplexed: this.fb.nonNullable.control(true),
    readType: this.fb.nonNullable.control<ReadType>('single-end'),
    fileFormat: this.fb.nonNullable.control<FileFormat>('fastq'),
  });

  /** Form group for primer sequences and randomized region configuration */
  readonly structureForm = this.fb.group(
    {
      fivePrime: this.fb.nonNullable.control('', { validators: [Validators.required] }),
      threePrime: this.fb.nonNullable.control(''),
      randomizedRegionType: this.fb.nonNullable.control<'exact' | 'range'>('exact'),
      randomizedExactLength: this.fb.control<number | null>(null, { validators: [Validators.min(1)] }),
      randomizedRangeMin: this.fb.control<number | null>(null, { validators: [Validators.min(1)] }),
      randomizedRangeMax: this.fb.control<number | null>(null, { validators: [Validators.min(1)] }),
    },
    { validators: this.randomizedRegionValidator() },
  );

  /** Form array containing all selection cycle configurations */
  readonly cyclesForm = this.fb.array<CycleFormGroup>([]);

  /** Tracks whether the form is currently being submitted */
  readonly isSubmitting = signal(false);

  /** Computed file extensions based on selected file format */
  readonly acceptedFileExtensions = computed(() =>
    this.generalForm.controls.fileFormat.value === 'fastq'
      ? '.fastq,.fq,.fastq.gz,.fq.gz'
      : '.fasta,.fa,.fna,.fasta.gz,.fa.gz',
  );

  constructor() {
    // Watch for changes to read type (single-end vs paired-end) to update reverse file validators for all cycles
    this.generalForm.controls.readType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncReverseValidators());
  }

  /**
   * Generates a human-readable summary of the randomized region configuration.
   * @returns A string describing the randomized region length or range
   */
  randomizedSummary(): string {
    const type = this.structureForm.controls.randomizedRegionType.value;
    if (type === 'exact') {
      return this.structureForm.controls.randomizedExactLength.value
        ? `${this.structureForm.controls.randomizedExactLength.value} bases`
        : 'Exact length pending';
    }
    const min = this.structureForm.controls.randomizedRangeMin.value;
    const max = this.structureForm.controls.randomizedRangeMax.value;
    return min && max ? `${min} - ${max} bases` : 'Range pending';
  }

  /**
   * Adds a new selection cycle to the cycles form array.
   * Updates round numbers and validates round name uniqueness.
   */
  addCycle(): void {
    const group = this.createCycleGroup();
    this.cyclesForm.push(group);
    this.updateRoundNumbers();
    this.validateRoundNameUniqueness();
    this.syncReverseValidators();
  }

  /**
   * Removes a selection cycle from the cycles form array.
   * @param index - The index of the cycle to remove
   */
  removeCycle(index: number): void {
    this.cyclesForm.removeAt(index);
    this.updateRoundNumbers();
    this.validateRoundNameUniqueness();
    this.syncReverseValidators();
  }

  /**
   * Handles drag-and-drop reordering of selection cycles.
   * @param event - The CDK drag-drop event containing previous and current indices
   */
  reorderCycles(event: CdkDragDrop<CycleFormGroup[]>): void {
    moveItemInArray(this.cyclesForm.controls, event.previousIndex, event.currentIndex);
    this.updateRoundNumbers();
    this.validateRoundNameUniqueness();
  }

  /**
   * Creates a new form group for a selection cycle with all required controls.
   * @returns A configured form group for a single cycle
   */
  private createCycleGroup(): CycleFormGroup {
    const group = this.fb.group({
      roundNumber: this.fb.nonNullable.control(this.cyclesForm.length + 1, {
        validators: [Validators.required, Validators.min(1)],
      }),
      roundName: this.fb.nonNullable.control('', Validators.required),
      forwardFiles: this.fb.control<File | null>(null),
      reverseFiles: this.fb.control<File | null>(null),
      isControl: this.fb.nonNullable.control(false),
      isCounterSelection: this.fb.nonNullable.control(false),
    });

    group.controls.roundName.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.validateRoundNameUniqueness());

    return group;
  }

  /**
   * Navigates to a specific step in the wizard.
   * @param stepIndex - The zero-based index of the step to navigate to
   */
  goToStep(stepIndex: number): void {
    const stepper = this.stepper();
    if (stepper) {
      stepper.selectedIndex = stepIndex;
    }
  }

  /**
   * Submits the experiment creation form.
   * Validates all form sections, sends POST request to backend,
   * and handles success/error responses.
   */
  submit(): void {
    if (this.generalForm.invalid || this.structureForm.invalid || this.cyclesForm.invalid || !this.cyclesForm.length) {
      this.snackBar.open('Please complete all required fields before creating the experiment.', 'Dismiss', {
        duration: 3000,
      });
      return;
    }

    this.isSubmitting.set(true);

    const selectionCycles: SelectionCycle[] = this.cyclesForm.controls.map((cycle) => ({
      roundNumber: cycle.controls.roundNumber.value,
      roundName: cycle.controls.roundName.value,
      isControl: cycle.controls.isControl.value,
      isCounterSelection: cycle.controls.isCounterSelection.value,
      files: {
        forward: cycle.controls.forwardFiles.value!,
        reverse: cycle.controls.reverseFiles.value ?? undefined,
      },
    }));

    const payload: CreateExperimentDto = {
      name: this.generalForm.controls.name.value,
      description: this.generalForm.controls.description.value,
      sequencing: {
        isDemultiplexed: this.generalForm.controls.isDemultiplexed.value,
        readType: this.generalForm.controls.readType.value,
        fileFormat: this.generalForm.controls.fileFormat.value,
        primers: {
          fivePrime: this.structureForm.controls.fivePrime.value,
          threePrime: this.structureForm.controls.threePrime.value || undefined,
        },
        randomizedRegion:
          this.structureForm.controls.randomizedRegionType.value === 'exact'
            ? {
              type: 'exact' as const,
              exactLength: this.structureForm.controls.randomizedExactLength.value ?? 0,
            }
            : {
              type: 'range' as const,
              min: this.structureForm.controls.randomizedRangeMin.value ?? 0,
              max: this.structureForm.controls.randomizedRangeMax.value ?? 0,
            },
      },
      selectionCycles,
    };

    const dialogRef = this.dialog.open(ProgressDialogComponent, {
      disableClose: true,
      data: { title: 'Creating experiment' },
    });

    dialogRef.componentInstance?.appendLog('Submitting experiment data...', false);

    this.experimentsStore
      .createExperimentWithFiles(payload, (progress) => {
        dialogRef.componentInstance?.appendLog(`Uploading files... ${progress}%`, false);
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          console.error('Failed to create experiment:', error);
          this.isSubmitting.set(false);
          dialogRef.close();
          this.snackBar.open(
            'Failed to create experiment. Please try again or contact support.',
            'Dismiss',
            { duration: 10000 }
          );
          return of(null);
        })
      )
      .subscribe((experiment) => {
        if (!experiment) {
          return;
        }

        dialogRef.componentInstance?.appendLog('Experiment created successfully', false);
        dialogRef.componentInstance?.appendLog('All files uploaded', false);
        dialogRef.componentInstance?.appendLog('Completed', true);

        this.isSubmitting.set(false);
        dialogRef.close();
        this.router.navigate(['/experiments']);
        this.snackBar.open('Experiment created successfully.', 'View', { duration: 3500 });
      });
  }

  /**
   * Updates round numbers for all cycles based on their position in the array.
   * Called after adding, removing, or reordering cycles.
   */
  private updateRoundNumbers(): void {
    this.cyclesForm.controls.forEach((cycle, index) => {
      cycle.controls.roundNumber.setValue(index + 1, { emitEvent: false });
    });
  }

  /**
   * Synchronizes validators for reverse file controls based on read type.
   * Makes reverse files required for paired-end reads, optional for single-end.
   */
  private syncReverseValidators(): void {
    const paired = this.generalForm.controls.readType.value === 'paired-end';
    this.cyclesForm.controls.forEach((cycle) => {
      if (paired) {
        cycle.controls.reverseFiles.setValidators([Validators.required]);
      } else {
        cycle.controls.reverseFiles.clearValidators();
        cycle.controls.reverseFiles.setValue(null, { emitEvent: false });
      }
      cycle.controls.reverseFiles.updateValueAndValidity({ emitEvent: false });
    });
  }

  /**
   * Validates that all round names are unique (case-insensitive).
   * Sets 'duplicateRoundName' error on controls with duplicate names.
   */
  private validateRoundNameUniqueness(): void {
    const occurrences = new Map<string, number>();
    this.cyclesForm.controls.forEach((cycle) => {
      const key = cycle.controls.roundName.value.trim().toLocaleLowerCase();
      if (!key) {
        return;
      }
      occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
    });

    this.cyclesForm.controls.forEach((cycle) => {
      const control = cycle.controls.roundName;
      const key = control.value.trim().toLocaleLowerCase();
      if (!key) {
        const errors = { ...control.errors };
        delete errors['duplicateRoundName'];
        control.setErrors(Object.keys(errors).length ? errors : null);
        return;
      }
      const isDuplicate = (occurrences.get(key) ?? 0) > 1;
      const errors = { ...control.errors };
      if (isDuplicate) {
        errors['duplicateRoundName'] = true;
      } else {
        delete errors['duplicateRoundName'];
      }
      control.setErrors(Object.keys(errors).length ? errors : null);
    });
  }

  /**
   * Custom validator that checks if an experiment name is already in use.
   * @returns A validator function that returns a validation error if the name is duplicate
   */
  private uniqueExperimentNameValidator(): ValidatorFn {
    return (control) => {
      const raw = control.value;
      if (typeof raw !== 'string') {
        return null;
      }
      const name = raw.trim();
      if (!name) {
        return null;
      }
      return this.experimentsStore.isNameAvailable(name) ? null : { duplicate: true };
    };
  }

  /**
   * Custom form group validator for randomized region configuration.
   * Ensures exact length is provided when no 3' primer is specified,
   * and validates range constraints when range type is selected.
   * @returns A validator function that returns appropriate validation errors
   */
  private randomizedRegionValidator(): ValidatorFn {
    return (group) => {
      const threePrime = (group.get('threePrime')?.value as string | undefined)?.trim() ?? '';
      const type = group.get('randomizedRegionType')?.value as 'exact' | 'range';

      if (!threePrime && type !== 'exact') {
        return { requiresExactLength: true };
      }

      if (type === 'exact') {
        const exact = (group.get('randomizedExactLength')?.value as number | null) ?? 0;
        return exact > 0 ? null : { requiresExactLength: true };
      }

      const min = (group.get('randomizedRangeMin')?.value as number | null) ?? 0;
      const max = (group.get('randomizedRangeMax')?.value as number | null) ?? 0;
      if (min <= 0 || max <= 0 || min >= max) {
        return { invalidRange: true };
      }

      return null;
    };
  }
}
