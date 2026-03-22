import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts';

export type ChartExportFormat = 'png' | 'svg';

export interface ChartExportRequest {
  format: ChartExportFormat;
  height: number;
  options: EChartsOption;
  theme?: string;
  width: number;
}

type SvgCapableChart = echarts.EChartsType & {
  renderToSVGString: () => string;
};

@Injectable({
  providedIn: 'root',
})
export class ChartExportService {
  async exportChart(request: ChartExportRequest): Promise<Blob> {
    const hostElement = document.createElement('div');
    hostElement.style.position = 'fixed';
    hostElement.style.left = '-10000px';
    hostElement.style.top = '0';
    hostElement.style.width = `${request.width}px`;
    hostElement.style.height = `${request.height}px`;
    hostElement.style.pointerEvents = 'none';
    hostElement.style.opacity = '0';

    document.body.appendChild(hostElement);

    const renderer = request.format === 'svg' ? 'svg' : 'canvas';
    const theme = request.theme === 'default' ? undefined : request.theme;
    const chart = echarts.init(hostElement, theme, {
      renderer,
      width: request.width,
      height: request.height,
    });

    try {
      chart.setOption(request.options, { notMerge: true, lazyUpdate: false });
      chart.resize({ width: request.width, height: request.height });
      await this.waitForChartRender(chart);

      if (request.format === 'svg') {
        const svgMarkup = (chart as SvgCapableChart).renderToSVGString();
        return new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      }

      const pngDataUrl = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: this.resolveBackgroundColor(),
      });
      return this.dataUrlToBlob(pngDataUrl);
    } finally {
      chart.dispose();
      hostElement.remove();
    }
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

      const timeoutId = window.setTimeout(complete, 250);
      chart.on('finished', complete);
      window.requestAnimationFrame(() => chart.resize());
    });
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
  }

  private resolveBackgroundColor(): string {
    return getComputedStyle(document.body).backgroundColor || '#ffffff';
  }
}
