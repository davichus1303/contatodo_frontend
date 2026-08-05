import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { SalesComponent } from './features/sales/sales.component';
import { SalesHistoryComponent } from './features/sales/sales-history/sales-history.component';
import { ProductsComponent } from './features/products/products.component';
import { AcquisitionsComponent } from './features/acquisitions/acquisitions.component';
import { NewAcquisitionComponent } from './features/acquisitions/new-acquisition.component';
import { AcquisitionTypeCatalogComponent } from './features/acquisition-type-catalog/acquisition-type-catalog.component';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginGuard } from './core/guards/login.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [LoginGuard]
  },
  {
    path: 'sales',
    component: SalesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'sales-history',
    component: SalesHistoryComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'products',
    component: ProductsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'acquisitions',
    component: AcquisitionsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'acquisitions/new',
    component: NewAcquisitionComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'acquisition-type-catalog',
    component: AcquisitionTypeCatalogComponent,
    canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: '/sales',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/sales'
  }
];
