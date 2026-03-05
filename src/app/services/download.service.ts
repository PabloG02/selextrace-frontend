import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

  /**
   * Triggers a browser download for a provided Blob object.
   * @param blob The Blob object containing your data.
   * @param filename The name the file should be saved as.
   */
  downloadBlob(blob: Blob, filename: string): void {
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

    // Firefox can ignore synthetic blob-link downloads and navigate instead.
    // For reasonably sized files, a data URL fallback is more reliable.
    if (isFirefox && blob.size <= 10 * 1024 * 1024) {
      this.downloadBlobAsDataUrl(blob, filename);
      return;
    }

    this.downloadBlobAsObjectUrl(blob, filename, isFirefox);
  }

  private downloadBlobAsObjectUrl(blob: Blob, filename: string, isFirefox: boolean): void {
    const url = window.URL.createObjectURL(blob);
    this.triggerDownload(url, filename, isFirefox);

    // Keep the object URL alive long enough for slower browser download startup.
    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 4000);
  }

  private downloadBlobAsDataUrl(blob: Blob, filename: string): void {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        this.downloadBlobAsObjectUrl(blob, filename, true);
        return;
      }

      this.triggerDownload(reader.result, filename, true);
    };

    reader.onerror = () => {
      this.downloadBlobAsObjectUrl(blob, filename, true);
    };

    reader.readAsDataURL(blob);
  }

  private triggerDownload(href: string, filename: string, openInNewTab: boolean): void {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.rel = 'noopener';
    if (openInNewTab) {
      // Prevent same-tab navigation if the download attribute is ignored.
      link.target = '_blank';
    }

    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();

    window.setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    }, 0);
  }
}
