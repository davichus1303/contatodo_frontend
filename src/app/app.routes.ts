import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { SalesComponent } from './features/sales/sales.component';
import { SalesHistoryComponent } from './features/sales/sales-history/sales-history.component';
import { ProductsComponent } from './features/products/products.component';
import { AcquisitionsComponent } from './features/acquisitions/acquisitions.component';
import { NewAcquisitionComponent } from './features/acquisitions/new-acquisition/new-acquisition.component';
import { AcquisitionTypeCatalogComponent } from './features/acquisition-type-catalog/acquisition-type-catalog.component';
import { RolesComponent } from './features/roles/roles.component';
import { UsersComponent } from './features/users/users.component';
import { CompanyCatalogComponent } from './features/company-catalog/company-catalog.component';
import { AccessDeniedComponent } from './features/access-denied/access-denied.component';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginGuard } from './core/guards/login.guard';
import { PermissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [LoginGuard]
  },
  {
    path: 'sales',
    component: SalesComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: { moduleLink: '/sales' } }
  },
  {
    path: 'sales-history',
    component: SalesHistoryComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: { moduleLink: '/sales-history' } }
  },
  {
    path: 'products',
    component: ProductsComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: { moduleLink: '/products' } }
  },
  {
    path: 'acquisitions',
    component: AcquisitionsComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: { moduleLink: '/acquisitions' } }
  },
  {
    path: 'acquisitions/new',
    component: NewAcquisitionComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: { moduleLink: '/acquisitions' } }
  },
  {
    path: 'acquisition-type-catalog',
    component: AcquisitionTypeCatalogComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: { moduleLink: '/acquisition-type-catalog' } }
  },
  {
    path: 'roles',
    component: RolesComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: { moduleLink: '/roles' } }
  },
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: { moduleLink: '/users' } }
  },
  {
    path: 'companies',
    component: CompanyCatalogComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: { moduleLink: '/companies' } }
  },
  {
    path: 'forbidden',
    component: AccessDeniedComponent,
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
