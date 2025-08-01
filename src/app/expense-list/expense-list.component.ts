
import { Pipe, PipeTransform, Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ExpenseService, Expense } from '../expense.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';

@Pipe({ name: 'filter', standalone: true })
export class ExpenseFilterPipe implements PipeTransform {
  transform(expenses: any[], searchText: string = '', filterCategory: string = ''): any[] {
    if (!expenses) return [];
    let filtered = expenses;
    if (searchText) {
      filtered = filtered.filter(e => e.desc?.toLowerCase().includes(searchText.toLowerCase()));
    }
    if (filterCategory) {
      filtered = filtered.filter(e => e.category === filterCategory);
    }
    return filtered;
  }
}



@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [ CommonModule, FormsModule, ExpenseFilterPipe],
  templateUrl: './expense-list.component.html',
  styleUrl: './expense-list.component.scss'
})
export class ExpenseListComponent implements OnInit {
  setTab(tab: 'card' | 'pie' | 'bar') {
    this.activeTab = tab;
    this.cdr.detectChanges();
    if (tab === 'pie') {
      setTimeout(() => this.renderPieChart(), 0);
    } else if (tab === 'bar') {
      setTimeout(() => this.renderBarChart(), 0);
    }
  }
  constructor(
    private expenseService: ExpenseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadExpenses();
  }
  activeCard: string = '';
  activeTab: 'card' | 'pie' | 'bar' = 'card';
  pieChart: any = null;
  barChart: any = null;
  notificationMessage: string = '';
  notificationType: 'success' | 'edit' | 'delete' | 'error' = 'success';

  animateCard(event: Event, card: string) {
    this.activeCard = card;
    const cardEl = (event.currentTarget as HTMLElement);
    cardEl.classList.remove('active');
    void cardEl.offsetWidth;
    cardEl.classList.add('active');
    setTimeout(() => {
      cardEl.classList.remove('active');
      this.activeCard = '';
    }, 600);
  }
  totalExpense = 0;
  highestExpense = 0;
  lowestExpense = 0;
  expenses: Expense[] = [];
  formExpense: Expense = { desc: '', amount: 0, date: '', category: '' };
  isEditing: boolean = false;
  selectedExpense: Expense | null = null;
  showViewPopup: boolean = false;
  editingId: string | null = null;
  searchText: string = '';
  filterCategory: string = '';
  isViewAll: boolean = false;

  get visibleExpenses() {
    let filtered = this.expenses;
    if (this.searchText) {
      filtered = filtered.filter(e => e.desc?.toLowerCase().includes(this.searchText.toLowerCase()));
    }
    if (this.filterCategory) {
      filtered = filtered.filter(e => e.category === this.filterCategory);
    }
    return this.isViewAll ? filtered : filtered.slice(0, 5);
  }

  toggleViewAll() {
    this.isViewAll = !this.isViewAll;
  }

  renderPieChart() {
    const ctx = document.getElementById('pieChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.pieChart) { this.pieChart.destroy(); }
    this.pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Total', 'Highest', 'Lowest'],
        datasets: [{
          data: [this.totalExpense, this.highestExpense, this.lowestExpense],
          backgroundColor: ['#fbbf24', '#60a5fa', '#34d399'], // yellow, blue, green
          hoverBackgroundColor: ['#f59e42', '#2563eb', '#059669'], // darker on hover
          borderColor: ['#f59e42', '#2563eb', '#059669'],
          borderWidth: 2
        }]
      },
      options: {
        plugins: { legend: { display: true, position: 'bottom' } },
        responsive: false,
        animation: {
          animateScale: true,
          animateRotate: true
        }
      }
    });
  }

  renderBarChart() {
    const ctx = document.getElementById('barChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.barChart) { this.barChart.destroy(); }
    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Total', 'Highest', 'Lowest'],
        datasets: [{
          label: 'Amount',
          data: [this.totalExpense, this.highestExpense, this.lowestExpense],
          backgroundColor: ['#a78bfa', '#f472b6', '#f87171'], // purple, pink, red
          hoverBackgroundColor: ['#7c3aed', '#be185d', '#b91c1c'], // darker on hover
          borderColor: ['#7c3aed', '#be185d', '#b91c1c'],
          borderWidth: 2
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        responsive: false,
        scales: { y: { beginAtZero: true } },
        animation: {
          duration: 1200,
          easing: 'easeOutCubic'
        }
      }
    });
  }

  loadExpenses() {
    this.expenseService.getExpenses().subscribe(data => {
      this.expenses = data;
      this.calculateSummary();
    });
  }

  calculateSummary() {
    if (!this.expenses.length) {
      this.totalExpense = 0;
      this.highestExpense = 0;
      this.lowestExpense = 0;
      return;
    }
    this.totalExpense = this.expenses.reduce((sum, e) => sum + (+e.amount || 0), 0);
    this.highestExpense = this.expenses.reduce((max, e) => +e.amount > max ? +e.amount : max, 0);
    this.lowestExpense = this.expenses.reduce((min, e) => +e.amount < min ? +e.amount : min, +this.expenses[0].amount || 0);
  }

  addExpense(form: any) {
    if (!this.formExpense.category || !this.formExpense.amount || !this.formExpense.date || !this.formExpense.desc) {
      this.showNotification('Please fill all required fields.', 'error');
      if (form) form.form.markAllAsTouched();
      return;
    }
    this.expenseService.addExpense(this.formExpense).subscribe(() => {
      this.formExpense = { desc: '', amount: 0, date: '', category: '' };
      this.loadExpenses();
      this.showNotification('Expense saved successfully!', 'success');
      if (form) form.resetForm();
    });
  }

  showDeleteConfirm: boolean = false;
  deleteId: string | null = null;

  openDeleteConfirm(id?: string) {
    this.deleteId = id || null;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm = false;
    this.deleteId = null;
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.expenseService.deleteExpense(this.deleteId).subscribe(() => {
      this.loadExpenses();
      this.closeDeleteConfirm();
      this.showNotification('Expense deleted successfully!', 'delete');
    });
  }

  viewExpense(expense: Expense) {
    this.selectedExpense = { ...expense };
    this.showViewPopup = true;
  }

  closePopup() {
    this.showViewPopup = false;
    this.selectedExpense = null;
  }

  editExpense(expense: Expense) {
    this.isEditing = true;
    this.editingId = expense._id || null;
    this.formExpense = { ...expense };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateExpense(form?: any) {
    if (!this.editingId) return;
    if (!this.formExpense.category || !this.formExpense.amount || !this.formExpense.date || !this.formExpense.desc) {
      this.showNotification('Please fill all required fields.', 'error');
      if (form) form.form.markAllAsTouched();
      return;
    }
    this.expenseService.updateExpense(this.editingId, this.formExpense).subscribe(() => {
      this.isEditing = false;
      this.editingId = null;
      this.formExpense = { desc: '', amount: 0, date: '', category: '' };
      this.loadExpenses();
      this.showNotification('Expense updated successfully!', 'edit');
      if (form) form.resetForm();
    });
  }
  cancelEdit() {
    this.isEditing = false;
    this.editingId = null;
    this.formExpense = { desc: '', amount: 0, date: '', category: '' };
  }

  showNotification(message: string, type: 'success' | 'edit' | 'delete' | 'error' = 'success') {
    this.notificationMessage = message;
    this.notificationType = type;
    setTimeout(() => {
      this.notificationMessage = '';
    }, 2200);
  }
}









