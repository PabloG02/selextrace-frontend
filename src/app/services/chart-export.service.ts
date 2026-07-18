import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts';

export type ChartExportFormat = 'png' | 'svg';

export interface ChartExportRequest {
  /**
   * Background to render behind the chart.
   * - `'transparent'` (default): no fill at all — PNGs get a real alpha channel.
   * - any CSS color string: filled solidly behind the chart (useful when the
   *   destination doesn't support transparency, e.g. pasting into a doc).
   */
  background?: 'transparent' | string;
  format: ChartExportFormat;
  height: number;
  options: EChartsOption;
  theme?: string;
  width: number;
}

const RENDER_TIMEOUT_MS = 2000;

@Injectable({
  providedIn: 'root',
})
export class ChartExportService {
  async exportChart(request: ChartExportRequest): Promise<Blob> {
    const { hostElement, chart } = this.createOffscreenChart(request);

    try {
      chart.setOption(request.options, { notMerge: true, lazyUpdate: false });
      await this.waitForChartRender(chart);

      return request.format === 'svg'
        ? this.exportAsSvg(hostElement, request.background)
        : await this.exportAsPng(chart, request.background);
    } finally {
      chart.dispose();
      hostElement.remove();
    }
  }

  private createOffscreenChart(
    request: ChartExportRequest
  ): { hostElement: HTMLDivElement; chart: echarts.EChartsType } {
    const hostElement = document.createElement('div');
    // Kept attached to the document (just off-screen) rather than detached:
    // some browsers give a fully detached canvas/SVG a zero layout box,
    // which silently produces an empty export.
    hostElement.style.position = 'fixed';
    hostElement.style.top = '0';
    hostElement.style.left = '-99999px';
    hostElement.style.width = `${request.width}px`;
    hostElement.style.height = `${request.height}px`;
    hostElement.style.pointerEvents = 'none';
    document.body.appendChild(hostElement);

    const renderer = request.format === 'svg' ? 'svg' : 'canvas';
    const theme = !request.theme || request.theme === 'default' ? undefined : request.theme;

    const chart = echarts.init(hostElement, theme, {
      renderer,
      width: request.width,
      height: request.height,
    });

    return { hostElement, chart };
  }

  private waitForChartRender(chart: echarts.EChartsType): Promise<void> {
    return new Promise((resolve) => {
      let resolved = false;
      const complete = () => {
        if (resolved) {
          return;
        }

        resolved = true;
        window.clearTimeout(timeoutId);
        chart.off('finished', complete);
        resolve();
      };

      // 'finished' fires once the chart's render pass settles. The timeout
      // is only a safety net — it must never race the real event, so there's
      // no extra resize/render pass here that could resolve too early.
      const timeoutId = window.setTimeout(complete, RENDER_TIMEOUT_MS);
      chart.on('finished', complete);
    });
  }

  private async exportAsPng(chart: echarts.EChartsType, background?: string): Promise<Blob> {
    const pngDataUrl = chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: this.resolveBackgroundColor(background),
    });
    return this.dataUrlToBlob(pngDataUrl);
  }

  private exportAsSvg(hostElement: HTMLElement, background?: string): Blob {
    const svgElement = hostElement.querySelector('svg');

    if (!svgElement) {
      throw new Error('Chart did not render an SVG element to export.');
    }

    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const resolvedBackground = this.resolveBackgroundColor(background);
    if (resolvedBackground !== 'transparent') {
      const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      backgroundRect.setAttribute('x', '0');
      backgroundRect.setAttribute('y', '0');
      backgroundRect.setAttribute('width', '100%');
      backgroundRect.setAttribute('height', '100%');
      backgroundRect.setAttribute('fill', resolvedBackground);
      svgClone.insertBefore(backgroundRect, svgClone.firstChild);
    }

    const svgMarkup = new XMLSerializer().serializeToString(svgClone);
    return new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  }

  /**
   * Transparent unless the caller asked for a specific background color.
   * We deliberately never fall back to the page/dialog's own background —
   * that's what made previous exports look "stained" with the app's UI color.
   */
  private resolveBackgroundColor(background?: string): string {
    if (!background || background === 'transparent') {
      return 'transparent';
    }

    return background;
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
  }
}
