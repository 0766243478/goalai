import axios from 'axios';
import type { User, MenuItem, Order, Expense, Debt, Note, AILog } from '../types';

const DETA_PROJECT_KEY = import.meta.env.VITE_DETA_PROJECT_KEY;
const DETA_BASE_ID = import.meta.env.VITE_DETA_BASE_ID;

const detaApi = axios.create({
  baseURL: `https://database.deta.sh/v1/${DETA_BASE_ID}`,
  headers: {
    'X-API-Key': DETA_PROJECT_KEY,
    'Content-Type': 'application/json',
  },
});

// Generic CRUD operations
async function fetchAll<T>(collection: string): Promise<T[]> {
  try {
    const response = await detaApi.post(`/${collection}/query`, {});
    return response.data.items || [];
  } catch (error) {
    console.error(`Error fetching ${collection}:`, error);
    return [];
  }
}

async function fetchByQuery<T>(collection: string, query: any): Promise<T[]> {
  try {
    const response = await detaApi.post(`/${collection}/query`, { query });
    return response.data.items || [];
  } catch (error) {
    console.error(`Error querying ${collection}:`, error);
    return [];
  }
}

async function create<T>(collection: string, data: T): Promise<T | null> {
  try {
    const response = await detaApi.post(`/${collection}/items`, { item: data });
    return response.data;
  } catch (error) {
    console.error(`Error creating in ${collection}:`, error);
    return null;
  }
}

async function update<T>(collection: string, key: string, data: Partial<T>): Promise<T | null> {
  try {
    const response = await detaApi.patch(`/${collection}/items/${key}`, { set: data });
    return response.data;
  } catch (error) {
    console.error(`Error updating in ${collection}:`, error);
    return null;
  }
}

async function remove(collection: string, key: string): Promise<boolean> {
  try {
    await detaApi.delete(`/${collection}/items/${key}`);
    return true;
  } catch (error) {
    console.error(`Error deleting from ${collection}:`, error);
    return false;
  }
}

// Users
export const userService = {
  getAll: () => fetchAll<User>('users'),
  getByEmail: (email: string) => fetchByQuery<User>('users', { email }),
  create: (user: User) => create<User>('users', user),
  update: (key: string, user: Partial<User>) => update<User>('users', key, user),
  delete: (key: string) => remove('users', key),
};

// Menu
export const menuService = {
  getAll: () => fetchAll<MenuItem>('menu'),
  getByCategory: (category: string) => fetchByQuery<MenuItem>('menu', { category }),
  create: (item: MenuItem) => create<MenuItem>('menu', item),
  update: (key: string, item: Partial<MenuItem>) => update<MenuItem>('menu', key, item),
  delete: (key: string) => remove('menu', key),
};

// Orders
export const orderService = {
  getAll: () => fetchAll<Order>('orders'),
  getByDate: (date: string) => fetchByQuery<Order>('orders', { date }),
  create: (order: Order) => create<Order>('orders', order),
  update: (key: string, order: Partial<Order>) => update<Order>('orders', key, order),
  delete: (key: string) => remove('orders', key),
};

// Expenses
export const expenseService = {
  getAll: () => fetchAll<Expense>('expenses'),
  getByDate: (date: string) => fetchByQuery<Expense>('expenses', { date }),
  getByType: (type: string) => fetchByQuery<Expense>('expenses', { type }),
  create: (expense: Expense) => create<Expense>('expenses', expense),
  update: (key: string, expense: Partial<Expense>) => update<Expense>('expenses', key, expense),
  delete: (key: string) => remove('expenses', key),
};

// Debts
export const debtService = {
  getAll: () => fetchAll<Debt>('debts'),
  getByCustomer: (customer_name: string) => fetchByQuery<Debt>('debts', { customer_name }),
  create: (debt: Debt) => create<Debt>('debts', debt),
  update: (key: string, debt: Partial<Debt>) => update<Debt>('debts', key, debt),
  delete: (key: string) => remove('debts', key),
};

// Notes
export const noteService = {
  getAll: () => fetchAll<Note>('notes'),
  getByDate: (date: string) => fetchByQuery<Note>('notes', { date }),
  getByCategory: (category: string) => fetchByQuery<Note>('notes', { category }),
  create: (note: Note) => create<Note>('notes', note),
  update: (key: string, note: Partial<Note>) => update<Note>('notes', key, note),
  delete: (key: string) => remove('notes', key),
};

// AI Logs
export const aiLogService = {
  getAll: () => fetchAll<AILog>('ai_logs'),
  getByType: (type: string) => fetchByQuery<AILog>('ai_logs', { type }),
  create: (log: AILog) => create<AILog>('ai_logs', log),
  delete: (key: string) => remove('ai_logs', key),
};
