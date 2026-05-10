import {ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild} from '@angular/core';
import {FornaContainer} from '@pablog02/fornac';

@Component({
  selector: 'app-fornac-visualization',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fornac-visualization.component.html',
  styleUrl: './fornac-visualization.component.scss',
})
export class FornacVisualizationComponent {
  readonly sequence = input<string | null>(null);
  readonly structure = input<string | null>(null);
  readonly highlightedSequence = input<string | null>(null);

  private readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('fornacHost');

  constructor() {
    effect((onCleanup) => {
      const container = this.containerRef();
      const sequence = this.sequence();
      const structure = this.structure();

      if (!container || !sequence || !structure) {
        return;
      }

      const element = container.nativeElement;
      element.innerHTML = '';

      const fornac = new FornaContainer(element, {
        animation: false,
        zoomable: true,
        initialSize: [500, 300],
        layout: 'naview'
      });

      const options = {
        structure,
        sequence,
      };

      fornac.addRNA(options.structure, options);

      // Defer highlighting so it runs after fornac's changeColorScheme()
      // has finished painting all nucleotides with their default colors.
      const timeoutId = setTimeout(() => {
        this.applyHighlighting(element, sequence, this.highlightedSequence());
      }, 0);

      onCleanup(() => {
        clearTimeout(timeoutId);
        element.innerHTML = '';
      });
    });
  }

  private applyHighlighting(element: HTMLDivElement, sequence: string, highlightedSequence: string | null): void {
    const normalizedHighlightedSequence = highlightedSequence?.trim().toUpperCase();

    if (!normalizedHighlightedSequence) {
      return;
    }

    const normalizedSequence = sequence.toUpperCase();
    const highlightedPositions = new Set<number>();
    let startIndex = 0;

    while (startIndex <= normalizedSequence.length - normalizedHighlightedSequence.length) {
      const matchIndex = normalizedSequence.indexOf(normalizedHighlightedSequence, startIndex);

      if (matchIndex === -1) {
        break;
      }

      for (let position = matchIndex; position < matchIndex + normalizedHighlightedSequence.length; position++) {
        highlightedPositions.add(position + 1); // fornac uses 1-based numbering
      }

      startIndex = matchIndex + normalizedHighlightedSequence.length;
    }

    if (highlightedPositions.size === 0) {
      return;
    }

    // Fornac sets node_num on circles as a plain 1-based integer (e.g. "1", "2", ...).
    // Note: the <g> wrapper element uses a "num" attribute with an "n" prefix (e.g. "n1"), but that is unrelated.
    const nucleotideNodes = element.querySelectorAll<SVGCircleElement>(
      'circle[node_type="nucleotide"][node_num]'
    );

    nucleotideNodes.forEach((node) => {
      const raw = node.getAttribute('node_num');
      const nodeNumber = raw !== null ? Number(raw) : NaN;

      if (!Number.isNaN(nodeNumber) && !highlightedPositions.has(nodeNumber)) {
        node.style.fill = 'white';
      }
    });
  }
}
