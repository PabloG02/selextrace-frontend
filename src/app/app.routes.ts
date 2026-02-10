import { Routes } from '@angular/router';
import { ExperimentsListComponent } from './components/experiments-list/experiments-list.component';
import { NewExperimentWizardComponent } from './components/new-experiment-wizard/new-experiment-wizard.component';
import { ExperimentDetailComponent } from './components/experiment-detail/experiment-detail.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'experiments',
	},
	{
		path: 'experiments',
		children: [
			{
				path: '',
				component: ExperimentsListComponent,
				title: 'Experiments • SELEXTrace',
			},
			{
				path: 'new',
				component: NewExperimentWizardComponent,
				title: 'Create Experiment • SELEXTrace',
			},
			{
				path: ':experimentId',
				component: ExperimentDetailComponent,
				title: 'Experiment Details • SELEXTrace',
			},
		],
	},
	{
		path: 'settings',
		component: SettingsComponent,
		title: 'Settings • SELEXTrace',
	},
	{
		path: '**',
		redirectTo: 'experiments',
	},
];
