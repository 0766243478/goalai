import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { MenuItem, Order, Expense, Debt, Note, DashboardStats } from '../types';
import { menuService, orderService, expenseService, debtService, noteService } from '../services/detaService';
import { calculateDashboardStats } from '../utils/calculations';
import { useMockData } from '../utils/mockData';

interface DataContextType {
  menu: MenuItem[];
  orders: Order[];
  expenses: Expense[];
  debts: Debt[];
  notes: Note[];
  stats: DashboardStats;
  loading: boolean;
  refreshData: () => Promise<void>;
  addMenuItem: (item: MenuItem) => Promise<void>;
  updateMenuItem: (key: string, item: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (key: string) => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  updateOrder: (key: string, order: Partial<Order>) => Promise<void>;
  deleteOrder: (key: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (key: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (key: string) => Promise<void>;
  addDebt: (debt: Debt) => Promise<void>;
  updateDebt: (key: string, debt: Partial<Debt>) => Promise<void>;
  deleteDebt: (key: string) => Promise<void>;
  addNote: (note: Note) => Promise<void>;
  updateNote: (key: string, note: Partial<Note>) => Promise<void>;
  deleteNote: (key: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const mockData = useMockData();
  const [menu, setMenu] = useState<MenuItem[]>(mockData.menu);
  const [orders, setOrders] = useState<Order[]>(mockData.orders);
  const [expenses, setExpenses] = useState<Expense[]>(mockData.expenses);
  const [debts, setDebts] = useState<Debt[]>(mockData.debts);
  const [notes, setNotes] = useState<Note[]>(mockData.notes);
  const [stats, setStats] = useState<DashboardStats>({
    totalSalesToday: 0,
    totalExpensesToday: 0,
    netProfit: 0,
    availableCash: 0,
    totalDebts: 0,
    unpaidDebts: 0,
  });
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [menuData, ordersData, expensesData, debtsData, notesData] = await Promise.all([
        menuService.getAll(),
        orderService.getAll(),
        expenseService.getAll(),
        debtService.getAll(),
        noteService.getAll(),
      ]);

      if (menuData.length > 0) setMenu(menuData);
      if (ordersData.length > 0) setOrders(ordersData);
      if (expensesData.length > 0) setExpenses(expensesData);
      if (debtsData.length > 0) setDebts(debtsData);
      if (notesData.length > 0) setNotes(notesData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const calculatedStats = calculateDashboardStats(orders, expenses, debts);
    setStats(calculatedStats);
  }, [orders, expenses, debts]);

  const addMenuItem = async (item: MenuItem) => {
    const newItem = await menuService.create(item);
    if (newItem) {
      setMenu(prev => [...prev, newItem]);
    }
  };

  const updateMenuItem = async (key: string, item: Partial<MenuItem>) => {
    const updated = await menuService.update(key, item);
    if (updated) {
      setMenu(prev => prev.map(m => m.key === key ? { ...m, ...item } : m));
    }
  };

  const deleteMenuItem = async (key: string) => {
    const success = await menuService.delete(key);
    if (success) {
      setMenu(prev => prev.filter(m => m.key !== key));
    }
  };

  const addOrder = async (order: Order) => {
    const newOrder = await orderService.create(order);
    if (newOrder) {
      setOrders(prev => [...prev, newOrder]);
      
      if (!order.is_paid) {
        const existingDebt = debts.find(d => d.customer_name === order.customer_name);
        if (existingDebt && existingDebt.key) {
          await updateDebt(existingDebt.key, {
            total_debt: existingDebt.total_debt + order.total_price,
            remaining: existingDebt.remaining + order.total_price,
            last_updated: order.date,
          });
        } else {
          await addDebt({
            customer_name: order.customer_name,
            total_debt: order.total_price,
            paid: 0,
            remaining: order.total_price,
            last_updated: order.date,
          });
        }
      }
      
      for (const item of order.items) {
        const menuItem = menu.find(m => m.key === item.menu_item_key);
        if (menuItem && menuItem.key) {
          await updateMenuItem(menuItem.key, {
            available_qty: menuItem.available_qty - item.quantity,
          });
        }
      }
    }
  };

  const updateOrder = async (key: string, order: Partial<Order>) => {
    const updated = await orderService.update(key, order);
    if (updated) {
      setOrders(prev => prev.map(o => o.key === key ? { ...o, ...order } : o));
    }
  };

  const deleteOrder = async (key: string) => {
    const success = await orderService.delete(key);
    if (success) {
      setOrders(prev => prev.filter(o => o.key !== key));
    }
  };

  const addExpense = async (expense: Expense) => {
    const newExpense = await expenseService.create(expense);
    if (newExpense) {
      setExpenses(prev => [...prev, newExpense]);
    }
  };

  const updateExpense = async (key: string, expense: Partial<Expense>) => {
    const updated = await expenseService.update(key, expense);
    if (updated) {
      setExpenses(prev => prev.map(e => e.key === key ? { ...e, ...expense } : e));
    }
  };

  const deleteExpense = async (key: string) => {
    const success = await expenseService.delete(key);
    if (success) {
      setExpenses(prev => prev.filter(e => e.key !== key));
    }
  };

  const addDebt = async (debt: Debt) => {
    const newDebt = await debtService.create(debt);
    if (newDebt) {
      setDebts(prev => [...prev, newDebt]);
    }
  };

  const updateDebt = async (key: string, debt: Partial<Debt>) => {
    const updated = await debtService.update(key, debt);
    if (updated) {
      setDebts(prev => prev.map(d => d.key === key ? { ...d, ...debt } : d));
    }
  };

  const deleteDebt = async (key: string) => {
    const success = await debtService.delete(key);
    if (success) {
      setDebts(prev => prev.filter(d => d.key !== key));
    }
  };

  const addNote = async (note: Note) => {
    const newNote = await noteService.create(note);
    if (newNote) {
      setNotes(prev => [...prev, newNote]);
    }
  };

  const updateNote = async (key: string, note: Partial<Note>) => {
    const updated = await noteService.update(key, note);
    if (updated) {
      setNotes(prev => prev.map(n => n.key === key ? { ...n, ...note } : n));
    }
  };

  const deleteNote = async (key: string) => {
    const success = await noteService.delete(key);
    if (success) {
      setNotes(prev => prev.filter(n => n.key !== key));
    }
  };

  return (
    <DataContext.Provider
      value={{
        menu,
        orders,
        expenses,
        debts,
        notes,
        stats,
        loading,
        refreshData,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        addOrder,
        updateOrder,
        deleteOrder,
        addExpense,
        updateExpense,
        deleteExpense,
        addDebt,
        updateDebt,
        deleteDebt,
        addNote,
        updateNote,
        deleteNote,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
