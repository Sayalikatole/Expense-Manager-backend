import { Routes } from '@angular/router';
import { ExpenseListComponent } from './expense-list/expense-list.component';


 export const routes: Routes = [
  { path: '', component: ExpenseListComponent },
  { path: 'expense', component: ExpenseListComponent }
];

