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
				title: 'Experiments • Aptasuite',
			},
			{
				path: 'new',
				component: NewExperimentWizardComponent,
				title: 'Create Experiment • Aptasuite',
			},
			{
				path: ':experimentId',
				component: ExperimentDetailComponent,
				title: 'Experiment Details • Aptasuite',
			},
		],
	},
	{
		path: 'settings',
		component: SettingsComponent,
		title: 'Settings • Aptasuite',
	},
	{
		path: '**',
		redirectTo: 'experiments',
	},
];
