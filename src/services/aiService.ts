import axios from 'axios';
import type { Order, Expense, MenuItem, Note, Debt } from '../types';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const openaiApi = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

interface AIRequest {
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

async function callAI(messages: AIRequest['messages'], temperature = 0.7): Promise<string> {
  try {
    const response = await openaiApi.post('/chat/completions', {
      model: 'gpt-4o-mini',
      messages,
      temperature,
      max_tokens: 1000,
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI API Error:', error);
    return 'AI service is currently unavailable. Please check your API key configuration.';
  }
}

export const aiService = {
  // Market Analysis
  async analyzeMarket(orders: Order[], menu: MenuItem[], expenses: Expense[]): Promise<string> {
    const salesData = orders.map(o => ({
      date: o.date,
      items: o.items.map(i => i.name),
      total: o.total_price,
    }));

    const prompt = `As a restaurant business analyst, analyze this sales data and provide market insights:

Sales Data: ${JSON.stringify(salesData.slice(-30))}
Menu Items: ${JSON.stringify(menu.map(m => ({ name: m.name, category: m.category, price: m.price })))}
Recent Expenses: ${JSON.stringify(expenses.slice(-10))}

Provide:
1. Demand trends (which items are selling well/poorly)
2. Seasonal patterns or market changes
3. Recommendations for menu adjustments
4. Pricing optimization suggestions

Keep it concise and actionable.`;

    return callAI([
      { role: 'system', content: 'You are an expert restaurant business analyst specializing in market trends and demand forecasting.' },
      { role: 'user', content: prompt },
    ]);
  },

  // Financial Behavior Analysis
  async analyzeFinancialBehavior(orders: Order[], expenses: Expense[], debts: Debt[]): Promise<string> {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total_price, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalDebts = debts.reduce((sum, d) => sum + d.remaining, 0);

    const prompt = `Analyze this restaurant's financial behavior:

Total Revenue: ${totalRevenue}
Total Expenses: ${totalExpenses}
Profit Margin: ${((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(2)}%
Outstanding Debts: ${totalDebts}

Expense Breakdown:
${expenses.slice(-20).map(e => `${e.type}: ${e.amount}`).join('\n')}

Provide:
1. Spending pattern analysis
2. Cost optimization opportunities
3. Profit margin improvement strategies
4. Cash flow management advice

Be specific and actionable.`;

    return callAI([
      { role: 'system', content: 'You are a financial advisor specializing in restaurant operations and cost optimization.' },
      { role: 'user', content: prompt },
    ]);
  },

  // Investment Suggestions
  async suggestInvestments(availableCash: number, orders: Order[], menu: MenuItem[]): Promise<string> {
    const avgDailySales = orders.length > 0 
      ? orders.reduce((sum, o) => sum + o.total_price, 0) / orders.length 
      : 0;

    const topSellingItems = menu
      .sort((a, b) => b.available_qty - a.available_qty)
      .slice(0, 5)
      .map(m => m.name);

    const prompt = `Provide investment recommendations for this restaurant:

Available Cash: ${availableCash}
Average Daily Sales: ${avgDailySales.toFixed(2)}
Top Selling Items: ${topSellingItems.join(', ')}

Suggest:
1. Smart investment opportunities (equipment, marketing, expansion)
2. Inventory optimization strategies
3. New revenue streams (delivery, catering, new products)
4. Risk assessment for each suggestion

Consider the available budget and provide realistic, actionable advice.`;

    return callAI([
      { role: 'system', content: 'You are a business growth consultant specializing in restaurant expansion and investment strategies.' },
      { role: 'user', content: prompt },
    ]);
  },

  // Chat Assistant
  async chat(userMessage: string, context: any): Promise<string> {
    const contextPrompt = `Current restaurant context:
- Total Sales Today: ${context.totalSalesToday || 0}
- Total Expenses Today: ${context.totalExpensesToday || 0}
- Net Profit: ${context.netProfit || 0}
- Available Cash: ${context.availableCash || 0}
- Outstanding Debts: ${context.unpaidDebts || 0}

User question: ${userMessage}`;

    return callAI([
      { role: 'system', content: 'You are a helpful AI assistant for restaurant management. Provide clear, concise answers based on the restaurant data. Be friendly and professional.' },
      { role: 'user', content: contextPrompt },
    ]);
  },

  // Weekly Summary
  async generateWeeklySummary(orders: Order[], expenses: Expense[], notes: Note[]): Promise<string> {
    const prompt = `Generate a weekly performance summary for this restaurant:

Orders This Week: ${orders.length}
Total Revenue: ${orders.reduce((sum, o) => sum + o.total_price, 0)}
Total Expenses: ${expenses.reduce((sum, e) => sum + e.amount, 0)}

Notable Issues:
${notes.slice(-10).map(n => `- ${n.category}: ${n.description}`).join('\n')}

Provide:
1. Performance highlights
2. Areas of concern
3. Improvement recommendations
4. Next week's focus areas

Keep it concise and actionable.`;

    return callAI([
      { role: 'system', content: 'You are a restaurant operations manager providing weekly performance reviews.' },
      { role: 'user', content: prompt },
    ]);
  },

  // Low Stock Alert Analysis
  async analyzeLowStock(lowStockItems: MenuItem[]): Promise<string> {
    if (lowStockItems.length === 0) return 'All items are well-stocked!';

    const prompt = `These menu items are running low on stock:

${lowStockItems.map(item => `- ${item.name}: ${item.available_qty} remaining (Category: ${item.category})`).join('\n')}

Provide:
1. Reorder priority recommendations
2. Suggested reorder quantities
3. Alternative menu suggestions if items run out
4. Impact assessment on operations`;

    return callAI([
      { role: 'system', content: 'You are an inventory management specialist for restaurants.' },
      { role: 'user', content: prompt },
    ], 0.5);
  },
};
