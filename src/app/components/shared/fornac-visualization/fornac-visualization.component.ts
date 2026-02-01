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

      onCleanup(() => {
        element.innerHTML = '';
      });
    });
  }
}
