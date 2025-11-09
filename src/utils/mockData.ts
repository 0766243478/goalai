import type { User, MenuItem, Order, Expense, Debt, Note } from '../types';
import { format, subDays } from 'date-fns';

// Mock data for demo purposes when Deta Base is not configured
export const mockUser: User = {
  key: 'user_1',
  name: 'Demo Manager',
  email: 'demo@restaurant.com',
  password: 'demo123',
  role: 'admin',
};

export const mockMenu: MenuItem[] = [
  { key: 'menu_1', name: 'Chicken Curry', price: 15000, available_qty: 25, category: 'Main Course' },
  { key: 'menu_2', name: 'Beef Stew', price: 18000, available_qty: 20, category: 'Main Course' },
  { key: 'menu_3', name: 'Fish & Chips', price: 20000, available_qty: 15, category: 'Main Course' },
  { key: 'menu_4', name: 'Vegetable Rice', price: 10000, available_qty: 30, category: 'Main Course' },
  { key: 'menu_5', name: 'Chapati', price: 2000, available_qty: 50, category: 'Sides' },
  { key: 'menu_6', name: 'Beans (Foul)', price: 8000, available_qty: 8, category: 'Main Course' },
  { key: 'menu_7', name: 'Orange Juice', price: 5000, available_qty: 40, category: 'Beverages' },
  { key: 'menu_8', name: 'Soda', price: 3000, available_qty: 60, category: 'Beverages' },
  { key: 'menu_9', name: 'Coffee', price: 4000, available_qty: 35, category: 'Beverages' },
  { key: 'menu_10', name: 'Samosa', price: 2500, available_qty: 45, category: 'Snacks' },
];

const today = format(new Date(), 'yyyy-MM-dd');
const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');

export const mockOrders: Order[] = [
  {
    key: 'order_1',
    date: today,
    customer_name: 'John Doe',
    items: [
      { menu_item_key: 'menu_1', name: 'Chicken Curry', quantity: 2, price: 15000 },
      { menu_item_key: 'menu_7', name: 'Orange Juice', quantity: 2, price: 5000 },
    ],
    total_price: 40000,
    is_paid: true,
  },
  {
    key: 'order_2',
    date: today,
    customer_name: 'Jane Smith',
    items: [
      { menu_item_key: 'menu_3', name: 'Fish & Chips', quantity: 1, price: 20000 },
      { menu_item_key: 'menu_8', name: 'Soda', quantity: 1, price: 3000 },
    ],
    total_price: 23000,
    is_paid: true,
  },
  {
    key: 'order_3',
    date: today,
    customer_name: 'Ahmed Hassan',
    items: [
      { menu_item_key: 'menu_2', name: 'Beef Stew', quantity: 3, price: 18000 },
      { menu_item_key: 'menu_5', name: 'Chapati', quantity: 6, price: 2000 },
    ],
    total_price: 66000,
    is_paid: false,
  },
  {
    key: 'order_4',
    date: yesterday,
    customer_name: 'Mary Johnson',
    items: [
      { menu_item_key: 'menu_4', name: 'Vegetable Rice', quantity: 2, price: 10000 },
      { menu_item_key: 'menu_9', name: 'Coffee', quantity: 2, price: 4000 },
    ],
    total_price: 28000,
    is_paid: true,
  },
  {
    key: 'order_5',
    date: yesterday,
    customer_name: 'Peter Brown',
    items: [
      { menu_item_key: 'menu_1', name: 'Chicken Curry', quantity: 1, price: 15000 },
      { menu_item_key: 'menu_10', name: 'Samosa', quantity: 4, price: 2500 },
    ],
    total_price: 25000,
    is_paid: true,
  },
];

export const mockExpenses: Expense[] = [
  { key: 'exp_1', date: today, type: 'food_supplies', amount: 50000, description: 'Vegetables and meat from market' },
  { key: 'exp_2', date: today, type: 'drinks', amount: 30000, description: 'Beverages stock refill' },
  { key: 'exp_3', date: yesterday, type: 'electricity', amount: 45000, description: 'Monthly electricity bill' },
  { key: 'exp_4', date: yesterday, type: 'wages', amount: 120000, description: 'Staff salaries - weekly' },
  { key: 'exp_5', date: twoDaysAgo, type: 'gas', amount: 25000, description: 'Cooking gas refill' },
  { key: 'exp_6', date: twoDaysAgo, type: 'maintenance', amount: 15000, description: 'Kitchen equipment repair' },
];

export const mockDebts: Debt[] = [
  {
    key: 'debt_1',
    customer_name: 'Ahmed Hassan',
    total_debt: 66000,
    paid: 0,
    remaining: 66000,
    last_updated: today,
  },
  {
    key: 'debt_2',
    customer_name: 'Sarah Wilson',
    total_debt: 45000,
    paid: 20000,
    remaining: 25000,
    last_updated: yesterday,
  },
];

export const mockNotes: Note[] = [
  {
    key: 'note_1',
    date: today,
    description: 'Customer complained about beans being cold',
    category: 'complaint',
  },
  {
    key: 'note_2',
    date: today,
    description: 'Wasted 2kg of vegetables due to spoilage',
    category: 'waste',
  },
  {
    key: 'note_3',
    date: yesterday,
    description: 'Customer returned fish dish - overcooked',
    category: 'food_returned',
  },
  {
    key: 'note_4',
    date: yesterday,
    description: 'Peak hours: 12pm-2pm and 7pm-9pm',
    category: 'observation',
  },
];

export function useMockData() {
  return {
    user: mockUser,
    menu: mockMenu,
    orders: mockOrders,
    expenses: mockExpenses,
    debts: mockDebts,
    notes: mockNotes,
  };
}
