import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { SalesComponent } from './features/sales/sales.component';
import { SalesHistoryComponent } from './features/sales/sales-history/sales-history.component';
import { ProductsComponent } from './features/products/products.component';
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
    path: '',
    redirectTo: '/sales',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/sales'
  }
];
