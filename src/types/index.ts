export interface User {
  key?: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'staff';
}

export interface MenuItem {
  key?: string;
  name: string;
  price: number;
  available_qty: number;
  category: string;
}

export interface OrderItem {
  menu_item_key: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  key?: string;
  date: string;
  customer_name: string;
  items: OrderItem[];
  total_price: number;
  is_paid: boolean;
}

export interface Expense {
  key?: string;
  date: string;
  type: 'rent' | 'food_supplies' | 'drinks' | 'wages' | 'electricity' | 'water' | 'gas' | 'maintenance' | 'other';
  amount: number;
  description: string;
}

export interface Debt {
  key?: string;
  customer_name: string;
  total_debt: number;
  paid: number;
  remaining: number;
  last_updated: string;
}

export interface Note {
  key?: string;
  date: string;
  description: string;
  category: 'complaint' | 'waste' | 'food_returned' | 'observation' | 'other';
}

export interface AILog {
  key?: string;
  type: 'market_analysis' | 'financial_behavior' | 'investment_suggestion' | 'chat' | 'general';
  suggestion: string;
  created_at: string;
}

export interface DashboardStats {
  totalSalesToday: number;
  totalExpensesToday: number;
  netProfit: number;
  availableCash: number;
  totalDebts: number;
  unpaidDebts: number;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface AIInsight {
  type: 'market' | 'financial' | 'investment';
  title: string;
  content: string;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
