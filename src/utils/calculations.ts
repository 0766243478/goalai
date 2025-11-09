import { format, startOfDay, endOfDay, isWithinInterval, subDays, startOfWeek, endOfWeek } from 'date-fns';
import type { Order, Expense, Debt, DashboardStats } from '../types';

export function calculateDashboardStats(
  orders: Order[],
  expenses: Expense[],
  debts: Debt[]
): DashboardStats {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const todayOrders = orders.filter(o => o.date === today);
  const todayExpenses = expenses.filter(e => e.date === today);
  
  const totalSalesToday = todayOrders.reduce((sum, o) => sum + o.total_price, 0);
  const totalExpensesToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalSalesToday - totalExpensesToday;
  
  const totalDebts = debts.reduce((sum, d) => sum + d.total_debt, 0);
  const unpaidDebts = debts.reduce((sum, d) => sum + d.remaining, 0);
  
  const paidAmount = todayOrders.filter(o => o.is_paid).reduce((sum, o) => sum + o.total_price, 0);
  const availableCash = paidAmount - totalExpensesToday;
  
  return {
    totalSalesToday,
    totalExpensesToday,
    netProfit,
    availableCash,
    totalDebts,
    unpaidDebts,
  };
}

export function getWeeklySalesData(orders: Order[]): Array<{ name: string; sales: number }> {
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const salesByDay: { [key: string]: number } = {};
  
  daysOfWeek.forEach(day => {
    salesByDay[day] = 0;
  });
  
  orders.forEach(order => {
    const orderDate = new Date(order.date);
    if (isWithinInterval(orderDate, { start: weekStart, end: weekEnd })) {
      const dayName = daysOfWeek[orderDate.getDay()];
      salesByDay[dayName] += order.total_price;
    }
  });
  
  return daysOfWeek.map(day => ({
    name: day,
    sales: salesByDay[day],
  }));
}

export function getExpenseBreakdown(expenses: Expense[]): Array<{ name: string; value: number }> {
  const breakdown: { [key: string]: number } = {};
  
  expenses.forEach(expense => {
    const type = expense.type.replace(/_/g, ' ');
    breakdown[type] = (breakdown[type] || 0) + expense.amount;
  });
  
  return Object.entries(breakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));
}

export function getLowStockItems<T extends { available_qty: number }>(
  items: T[],
  threshold: number = 10
): T[] {
  return items.filter(item => item.available_qty <= threshold);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
}

export function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getDateRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  const start = subDays(end, days);
  return { start, end };
}

export function filterByDateRange<T extends { date: string }>(
  items: T[],
  startDate: Date,
  endDate: Date
): T[] {
  return items.filter(item => {
    const itemDate = new Date(item.date);
    return isWithinInterval(itemDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
  });
}
