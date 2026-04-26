import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestOnlyGuard } from './auth.guards';
import { AdminUsersComponent } from './components/admin-users/admin-users.component';
import { AppShellComponent } from './components/app-shell/app-shell.component';
import { ExperimentDetailComponent } from './components/experiment-detail/experiment-detail.component';
import { ExperimentsListComponent } from './components/experiments-list/experiments-list.component';
import { LandingComponent } from './components/landing/landing.component';
import { SignInComponent } from './components/login/sign-in.component';
import { NewExperimentWizardComponent } from './components/new-experiment-wizard/new-experiment-wizard.component';
import { ProjectDetailComponent } from './components/project-detail/project-detail.component';
import { ProjectsListComponent } from './components/projects-list/projects-list.component';
import { SettingsComponent } from './components/settings/settings.component';
import { SignUpComponent } from './components/signup/sign-up.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: LandingComponent,
    title: 'SELEXTrace',
  },
  {
    path: 'login',
    component: SignInComponent,
    canActivate: [guestOnlyGuard],
    title: 'Login • SELEXTrace',
  },
  {
    path: 'signup',
    component: SignUpComponent,
    canActivate: [guestOnlyGuard],
    title: 'Create Account • SELEXTrace',
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
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
        path: 'projects',
        children: [
          {
            path: '',
            component: ProjectsListComponent,
            title: 'Projects • SELEXTrace',
          },
          {
            path: ':projectId',
            component: ProjectDetailComponent,
            title: 'Project Details • SELEXTrace',
          },
        ],
      },
      {
        path: 'admin/users',
        component: AdminUsersComponent,
        canActivate: [adminGuard],
        title: 'User Administration • SELEXTrace',
      },
      {
        path: 'settings',
        component: SettingsComponent,
        title: 'Settings • SELEXTrace',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
