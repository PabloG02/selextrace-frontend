import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FsbcAnalysisTabComponent } from './fsbc-analysis-tab.component';
import { FsbcApiService } from '../../services/fsbc-api.service';
import { ExperimentChartService } from '../../services/experiment-chart.service';
import { ThemeService } from '../../services/theme.service';
import { MatDialog } from '@angular/material/dialog';
import { ExperimentReport } from '../../models/experiment-report';

const EXPERIMENT_REPORT: ExperimentReport = {
  id: 'exp-1',
  createdAt: '2026-04-04T00:00:00Z',
  name: 'FSBC Demo',
  description: 'Synthetic report',
  sequencing: {
    aptamerSize: 4,
    fivePrimePrimer: 'GG',
    threePrimePrimer: 'CC'
  },
  importStats: {
    totalProcessedReads: 100,
    totalAcceptedReads: 100,
    contigAssemblyFailure: 0,
    invalidAlphabet: 0,
    fivePrimeError: 0,
    threePrimeError: 0,
    invalidCycle: 0,
    totalPrimerOverlaps: 0
  },
  selectionCycles: [
    {
      name: 'Round 1',
      round: 1,
      isControlSelection: false,
      isCounterSelection: false,
      barcode5Prime: null,
      barcode3Prime: null,
      totalSize: 40,
      uniqueSize: 2,
      counts: { 1: 25, 2: 15 }
    },
    {
      name: 'Round 2',
      round: 2,
      isControlSelection: false,
      isCounterSelection: false,
      barcode5Prime: null,
      barcode3Prime: null,
      totalSize: 60,
      uniqueSize: 2,
      counts: { 1: 35, 2: 25 }
    }
  ],
  pool: {
    idToAptamer: { 1: 'GGAAAACC', 2: 'GGAAATCC' },
    idToBounds: {
      1: { startIndex: 2, endIndex: 6 },
      2: { startIndex: 2, endIndex: 6 }
    }
  },
  technicalDetails: {
    metadata: {
      qualityScoresForward: {},
      qualityScoresReverse: {},
      nucleotideDistributionForward: {},
      nucleotideDistributionReverse: {},
      nucleotideDistributionAccepted: {
        'Round 1': { 4: { 0: { 65: 40 } } },
        'Round 2': { 4: { 0: { 65: 60 } } }
      }
    }
  }
};

describe('FsbcAnalysisTabComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FsbcAnalysisTabComponent],
      providers: [
        {
          provide: FsbcApiService,
          useValue: {
            getAnalysesRes: () => ({
              value: signal([]),
              reload: () => undefined
            }),
            createAnalysis: () => ({ pipe: () => ({ subscribe: () => undefined }) }),
            deleteAnalysis: () => ({ pipe: () => ({ subscribe: () => undefined }) })
          }
        },
        {
          provide: ExperimentChartService,
          useValue: {
            getFsbcRankedStringsChart: () => computed(() => ({})),
            getFsbcStringScatterChart: () => computed(() => ({})),
            getFsbcClusterOverviewChart: () => computed(() => ({})),
            getClusterSequenceLogoChart: () => computed(() => ({})),
            getClusterMutationRatesChart: () => computed(() => ({})),
            getSelectedAptamerCardinalityChart: () => computed(() => ({}))
          }
        },
        {
          provide: ThemeService,
          useValue: {
            echartsTheme: computed(() => 'light')
          }
        },
        {
          provide: MatDialog,
          useValue: {
            open: () => undefined
          }
        }
      ]
    })
      .overrideComponent(FsbcAnalysisTabComponent, {
        set: { template: '' }
      })
      .compileComponents();
  });

  it('defaults the run form to the last positive cycle', () => {
    const fixture = TestBed.createComponent(FsbcAnalysisTabComponent);
    fixture.componentRef.setInput('experimentId', 'exp-1');
    fixture.componentRef.setInput('experimentReport', EXPERIMENT_REPORT);
    fixture.detectChanges();

    expect(fixture.componentInstance.runForm.selectionCycleRound().value()).toBe(2);
  });
});
