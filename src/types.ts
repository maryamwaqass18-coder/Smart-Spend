export interface CategoryBudget {
  category: string;
  amount: number;
}

export interface MonthlyBudget {
  overall: number;
  categories: CategoryBudget[];
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
}

export interface AICategoryBreakdown {
  category: string;
  spent: number;
  budget: number;
  percentage: number;
}

export interface AITip {
  title: string;
  advice: string;
  category?: string;
  urgency: "high" | "medium" | "low";
}

export interface FinancialHealthResponse {
  score: number; // 0 - 100
  assessment: string;
  tips: AITip[];
  encouragement: string;
}
