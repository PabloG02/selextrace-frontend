import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  ChartExportFormat,
  ChartExportService,
} from '../../../services/chart-export.service';
import { ThemeService } from '../../../services/theme.service';

type AspectRatioPreset = 'current' | '16:9' | '4:3' | '1:1' | '21:9' | 'custom';

interface ChartViewerDialogData {
  exportFileName?: string;
  options: EChartsOption;
  title: string;
}

const DEFAULT_EXPORT_WIDTH = 1200;
const DEFAULT_EXPORT_HEIGHT = 675;
const DEFAULT_ASPECT_RATIO = 16 / 9;
const MIN_EXPORT_DIMENSION = 64;
const MAX_EXPORT_DIMENSION = 8000;
const DEFAULT_BACKGROUND_COLOR = '#ffffff';

const ASPECT_RATIO_VALUES: Record<Exclude<AspectRatioPreset, 'current' | 'custom'>, number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '21:9': 21 / 9,
};

@Component({
  selector: 'app-chart-viewer-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    NgxEchartsDirective,
  ],
  templateUrl: './chart-viewer-dialog.component.html',
  styleUrl: './chart-viewer-dialog.component.scss',
})
export class ChartViewerDialogComponent implements AfterViewInit, OnDestroy {
  protected readonly data = inject<ChartViewerDialogData>(MAT_DIALOG_DATA);
  protected readonly themeService = inject(ThemeService);
  private readonly chartExportService = inject(ChartExportService);

  private readonly previewElement = viewChild.required<ElementRef<HTMLElement>>('previewElement');

  readonly exportFormat = signal<ChartExportFormat>('png');
  readonly aspectRatioPreset = signal<AspectRatioPreset>('current');
  readonly lockAspectRatio = signal(true);
  readonly exportWidth = signal(DEFAULT_EXPORT_WIDTH);
  readonly exportHeight = signal(DEFAULT_EXPORT_HEIGHT);
  readonly transparentBackground = signal(true);
  readonly backgroundColor = signal(DEFAULT_BACKGROUND_COLOR);
  readonly isExporting = signal(false);
  readonly exportError = signal<string | null>(null);

  private previewWidth = DEFAULT_EXPORT_WIDTH;
  private previewHeight = DEFAULT_EXPORT_HEIGHT;
  private previewObserver?: ResizeObserver;
  private didInitializeDimensions = false;

  readonly aspectRatioOptions = [
    { value: 'current' as const, label: 'Current' },
    { value: '16:9' as const, label: '16:9' },
    { value: '4:3' as const, label: '4:3' },
    { value: '1:1' as const, label: '1:1' },
    { value: '21:9' as const, label: '21:9' },
    { value: 'custom' as const, label: 'Custom' },
  ];

  ngAfterViewInit(): void {
    const previewElement = this.previewElement().nativeElement;

    this.previewObserver = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);

      if (width <= 0 || height <= 0) {
        return;
      }

      this.previewWidth = width;
      this.previewHeight = height;

      if (!this.didInitializeDimensions) {
        this.exportWidth.set(width);
        this.exportHeight.set(height);
        this.didInitializeDimensions = true;
      }
    });

    this.previewObserver.observe(previewElement);
  }

  ngOnDestroy(): void {
    this.previewObserver?.disconnect();
  }

  protected updateFormat(format: string): void {
    if (format === 'png' || format === 'svg') {
      this.exportFormat.set(format);
    }
  }

  protected updateAspectRatioPreset(value: string): void {
    if (!this.isAspectRatioPreset(value)) {
      return;
    }

    this.aspectRatioPreset.set(value);

    if (value === 'custom') {
      return;
    }

    this.lockAspectRatio.set(true);
    this.syncHeightToWidth(this.resolveAspectRatio(value));
  }

  protected updateWidth(rawValue: string): void {
    const nextWidth = this.parseDimension(rawValue, this.exportWidth());
    this.exportWidth.set(nextWidth);

    if (this.lockAspectRatio()) {
      this.syncHeightToWidth(this.activeAspectRatio());
      return;
    }

    this.aspectRatioPreset.set('custom');
  }

  protected updateHeight(rawValue: string): void {
    const nextHeight = this.parseDimension(rawValue, this.exportHeight());
    this.exportHeight.set(nextHeight);

    if (this.lockAspectRatio()) {
      this.syncWidthToHeight(this.activeAspectRatio());
      return;
    }

    this.aspectRatioPreset.set('custom');
  }

  protected updateLockAspectRatio(checked: boolean): void {
    this.lockAspectRatio.set(checked);

    if (!checked) {
      this.aspectRatioPreset.set('custom');
      return;
    }

    this.syncHeightToWidth(this.activeAspectRatio());
  }

  protected updateTransparentBackground(checked: boolean): void {
    this.transparentBackground.set(checked);
  }

  protected updateBackgroundColor(value: string): void {
    this.backgroundColor.set(value);
  }

  protected async exportChart(): Promise<void> {
    this.isExporting.set(true);
    this.exportError.set(null);

    try {
      const blob = await this.chartExportService.exportChart({
        format: this.exportFormat(),
        width: this.exportWidth(),
        height: this.exportHeight(),
        options: this.data.options,
        theme: this.themeService.echartsTheme(),
        background: this.transparentBackground() ? 'transparent' : this.backgroundColor(),
      });

      this.downloadBlob(blob, `${this.slugify(this.data.exportFileName ?? this.data.title)}.${this.exportFormat()}`);
    } catch (error) {
      console.error('Failed to export chart', error);
      this.exportError.set('The chart could not be exported. Please try again.');
    } finally {
      this.isExporting.set(false);
    }
  }

  private syncHeightToWidth(aspectRatio: number): void {
    this.exportHeight.set(
      this.clampDimension(Math.round(this.exportWidth() / aspectRatio))
    );
  }

  private syncWidthToHeight(aspectRatio: number): void {
    this.exportWidth.set(
      this.clampDimension(Math.round(this.exportHeight() * aspectRatio))
    );
  }

  private activeAspectRatio(): number {
    return this.resolveAspectRatio(this.aspectRatioPreset());
  }

  private resolveAspectRatio(preset: AspectRatioPreset): number {
    if (preset === 'custom') {
      return this.safeAspectRatio(this.exportWidth(), this.exportHeight());
    }

    if (preset === 'current') {
      return this.safeAspectRatio(this.previewWidth, this.previewHeight);
    }

    return ASPECT_RATIO_VALUES[preset];
  }

  /** Falls back to a sane default if the preview hasn't been measured yet. */
  private safeAspectRatio(width: number, height: number): number {
    const ratio = width / height;
    return Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_ASPECT_RATIO;
  }

  private parseDimension(rawValue: string, fallback: number): number {
    const parsed = Number.parseInt(rawValue, 10);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return this.clampDimension(parsed);
  }

  private clampDimension(value: number): number {
    return Math.min(MAX_EXPORT_DIMENSION, Math.max(MIN_EXPORT_DIMENSION, value));
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'chart-export';
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  }

  private isAspectRatioPreset(value: string): value is AspectRatioPreset {
    return value === 'current'
      || value === '16:9'
      || value === '4:3'
      || value === '1:1'
      || value === '21:9'
      || value === 'custom';
  }
}
