import React, { useState, useEffect, useMemo } from "react";
import { 
  PiggyBank, 
  TrendingUp, 
  Plus, 
  Search, 
  Sparkles, 
  Trash2, 
  DollarSign, 
  Calendar, 
  ArrowRight, 
  Tag, 
  Sliders, 
  PieChart as PieIcon, 
  Info, 
  AlertTriangle, 
  Home, 
  Utensils, 
  Zap, 
  Car, 
  Film, 
  ShoppingBag, 
  Activity, 
  MoreHorizontal,
  ChevronRight,
  Sparkle,
  ArrowUpRight,
  TrendingDown,
  Percent,
  RefreshCw,
  Award,
  Database,
  Cloud,
  Send,
  Bot,
  MessageSquare
} from "lucide-react";
import { db, collection, doc, getDoc, setDoc, getDocs, deleteDoc } from "./lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from "recharts";
import { MonthlyBudget, Expense, FinancialHealthResponse } from "./types";
import heroImage from "./assets/images/hero_finances_1783467222896.jpg";

// Categories styling and mapping
export const CATEGORIES = [
  { name: "Food & Dining", color: "#f97316", lightColor: "#ffedd5", icon: Utensils },
  { name: "Rent & Housing", color: "#3b82f6", lightColor: "#dbeafe", icon: Home },
  { name: "Utilities & Bills", color: "#8b5cf6", lightColor: "#ede9fe", icon: Zap },
  { name: "Transportation", color: "#06b6d4", lightColor: "#ecfeff", icon: Car },
  { name: "Entertainment & Leisure", color: "#ec4899", lightColor: "#fce7f3", icon: Film },
  { name: "Shopping", color: "#f59e0b", lightColor: "#fef3c7", icon: ShoppingBag },
  { name: "Health & Wellness", color: "#f43f5e", lightColor: "#ffe4e6", icon: Activity },
  { name: "Miscellaneous", color: "#6b7280", lightColor: "#f3f4f6", icon: MoreHorizontal }
];

// Initial preloaded data set to 0 as requested for a clean slate
const INITIAL_BUDGET: MonthlyBudget = {
  overall: 0,
  categories: [
    { category: "Food & Dining", amount: 0 },
    { category: "Rent & Housing", amount: 0 },
    { category: "Utilities & Bills", amount: 0 },
    { category: "Transportation", amount: 0 },
    { category: "Entertainment & Leisure", amount: 0 },
    { category: "Shopping", amount: 0 },
    { category: "Health & Wellness", amount: 0 },
    { category: "Miscellaneous", amount: 0 }
  ]
};

const INITIAL_EXPENSES: Expense[] = [];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const ROTATING_AI_MESSAGES = [
  "Synthesizing transaction history...",
  "Aggregating category-specific thresholds...",
  "Evaluating spending-to-budget velocity...",
  "Consulting household finance formulas...",
  "Drafting custom money-saving tips..."
];

export default function App() {
  // Page level states
  const [started, setStarted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"overview" | "budgeting" | "transactions" | "ai-coach">("overview");

  // Database Sync States
  const [dbLoading, setDbLoading] = useState<boolean>(true);
  const [dbSaving, setDbSaving] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string>("");

  // Budget & Spending States
  const [budget, setBudget] = useState<MonthlyBudget>(INITIAL_BUDGET);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);

  // Initial load from Firestore database
  useEffect(() => {
    async function loadFromFirestore() {
      try {
        setDbLoading(true);
        setDbError("");

        // Fetch current budget config
        const budgetDocRef = doc(db, "budgets", "current_budget");
        let budgetSnap;
        try {
          budgetSnap = await getDoc(budgetDocRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, "budgets/current_budget");
          throw err;
        }

        if (budgetSnap.exists()) {
          setBudget(budgetSnap.data() as MonthlyBudget);
        } else {
          // If no budget doc exists, write the initial zero budget
          try {
            await setDoc(budgetDocRef, INITIAL_BUDGET);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, "budgets/current_budget");
            throw err;
          }
          setBudget(INITIAL_BUDGET);
        }

        // Fetch all expense transactions
        const expensesColRef = collection(db, "expenses");
        let expensesSnap;
        try {
          expensesSnap = await getDocs(expensesColRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, "expenses");
          throw err;
        }

        const expensesList: Expense[] = [];
        expensesSnap.forEach((doc) => {
          const data = doc.data();
          expensesList.push({
            id: doc.id,
            amount: Number(data.amount),
            category: data.category || "Miscellaneous",
            date: data.date || "",
            description: data.description || ""
          });
        });
        setExpenses(expensesList);

      } catch (err: any) {
        console.error("Firestore loading error: ", err);
        setDbError("Unable to load cloud database. Working in local sandbox mode.");
        
        // Fallback to local storage if firestore fails
        const savedBudget = localStorage.getItem("smartspend_budget");
        if (savedBudget) setBudget(JSON.parse(savedBudget));
        
        const savedExpenses = localStorage.getItem("smartspend_expenses");
        if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      } finally {
        setDbLoading(false);
      }
    }

    loadFromFirestore();
  }, []);

  // Sync to localStorage as redundancy
  useEffect(() => {
    if (!dbLoading) {
      localStorage.setItem("smartspend_budget", JSON.stringify(budget));
    }
  }, [budget, dbLoading]);

  useEffect(() => {
    if (!dbLoading) {
      localStorage.setItem("smartspend_expenses", JSON.stringify(expenses));
    }
  }, [expenses, dbLoading]);

  // Form states for adding new expenses
  const [newAmount, setNewAmount] = useState<string>("");
  const [newCategory, setNewCategory] = useState<string>("Food & Dining");
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newDescription, setNewDescription] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Filters for listing expenses
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  // AI Money Tips States
  const [aiTips, setAiTips] = useState<FinancialHealthResponse | null>(() => {
    const saved = localStorage.getItem("smartspend_aitips");
    return saved ? JSON.parse(saved) : null;
  });
  const [isGeneratingTips, setIsGeneratingTips] = useState<boolean>(false);
  const [tipsError, setTipsError] = useState<string>("");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState<number>(0);

  // Rotate AI Loading message
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGeneratingTips) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % ROTATING_AI_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGeneratingTips]);

  // AI Coach Chat States
  const [chatHistory, setChatHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem("smartspend_chathistory");
    return saved ? JSON.parse(saved) : [
      {
        id: "welcome",
        role: "model",
        text: "Hi there! I'm your SmartSpend AI Money Coach. Ask me anything about budgeting, saving, or whether you should make a particular purchase!",
        timestamp: new Date().toISOString()
      }
    ];
  });
  const [chatInput, setChatInput] = useState<string>("");
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string>("");

  useEffect(() => {
    localStorage.setItem("smartspend_chathistory", JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    const element = document.getElementById("chat-thread-container");
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [chatHistory, isSendingChat, activeTab]);

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatError("");

    const newUserMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      text: userMsg,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...chatHistory, newUserMessage];
    setChatHistory(updatedHistory);
    setIsSendingChat(true);

    try {
      const apiHistory = chatHistory.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }));

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: apiHistory,
          message: userMsg,
          budget,
          expenses
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to get response from AI Coach.");
      }

      const data = await response.json();

      setChatHistory(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: "model",
          text: data.text,
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "Something went wrong. Please check your connection or try again.");
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleClearChatHistory = () => {
    setChatHistory([
      {
        id: "welcome",
        role: "model",
        text: "Hi there! I'm your SmartSpend AI Money Coach. Ask me anything about budgeting, saving, or whether you should make a particular purchase!",
        timestamp: new Date().toISOString()
      }
    ]);
    setChatError("");
  };

  // Derived Statistics
  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const budgetProgress = useMemo(() => {
    const budgetTotal = budget.overall || 1;
    return Math.min(Math.round((totalSpent / budgetTotal) * 100), 100);
  }, [totalSpent, budget.overall]);

  const totalCategorized = useMemo(() => {
    return (budget.categories || []).reduce((sum, c) => sum + Number(c.amount), 0);
  }, [budget.categories]);

  const remainingToDistribute = useMemo(() => {
    return budget.overall - totalCategorized;
  }, [budget.overall, totalCategorized]);

  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    CATEGORIES.forEach(c => map[c.name] = 0);
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return Object.keys(map).map(cat => ({
      name: cat,
      value: parseFloat(map[cat].toFixed(2)),
      color: CATEGORIES.find(c => c.name === cat)?.color || "#9ca3af"
    })).filter(item => item.value > 0);
  }, [expenses]);

  const categoryCompareData = useMemo(() => {
    const actualMap: Record<string, number> = {};
    expenses.forEach(e => {
      actualMap[e.category] = (actualMap[e.category] || 0) + Number(e.amount);
    });

    return budget.categories.map(catBudget => {
      const actual = actualMap[catBudget.category] || 0;
      return {
        name: catBudget.category,
        Budget: catBudget.amount,
        Actual: parseFloat(actual.toFixed(2))
      };
    });
  }, [budget, expenses]);

  // Handle adding expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || !newCategory || !newDate || !newDescription) {
      alert("Please fill in all transaction fields.");
      return;
    }

    const expenseItem: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(newAmount),
      category: newCategory,
      date: newDate,
      description: newDescription.trim()
    };

    // Update locally for instant responsive feel
    setExpenses(prev => [expenseItem, ...prev]);
    setNewAmount("");
    setNewDescription("");
    setShowAddForm(false);

    // Save to firestore db
    try {
      setDbSaving(true);
      await setDoc(doc(db, "expenses", expenseItem.id), {
        amount: expenseItem.amount,
        category: expenseItem.category,
        date: expenseItem.date,
        description: expenseItem.description
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `expenses/${expenseItem.id}`);
      console.error("Error writing expense to Firestore:", err);
      setDbError("Failed to sync new transaction with the cloud database.");
    } finally {
      setDbSaving(false);
    }
  };

  // Handle removing expense
  const handleRemoveExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));

    try {
      setDbSaving(true);
      await deleteDoc(doc(db, "expenses", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
      console.error("Error deleting expense from Firestore:", err);
      setDbError("Failed to delete transaction from the cloud database.");
    } finally {
      setDbSaving(false);
    }
  };

  // Handle overall budget change
  const handleUpdateOverallBudget = async (amount: number) => {
    const nextAmount = Math.max(0, amount);
    setBudget(prev => {
      const nextBudget = {
        ...prev,
        overall: nextAmount
      };

      // Background write
      setDoc(doc(db, "budgets", "current_budget"), nextBudget).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, "budgets/current_budget");
        console.error("Error writing budget to Firestore:", err);
        setDbError("Failed to sync overall budget change to the cloud database.");
      });

      return nextBudget;
    });
  };

  // Handle category budget change
  const handleUpdateCategoryBudget = async (categoryName: string, amount: number) => {
    const nextAmount = Math.max(0, amount);
    setBudget(prev => {
      const idx = prev.categories.findIndex(c => c.category === categoryName);
      let updatedCats = [...prev.categories];
      if (idx > -1) {
        updatedCats[idx] = { category: categoryName, amount: nextAmount };
      } else {
        updatedCats.push({ category: categoryName, amount: nextAmount });
      }
      
      const nextBudget = {
        ...prev,
        categories: updatedCats
      };

      // Background write
      setDoc(doc(db, "budgets", "current_budget"), nextBudget).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, "budgets/current_budget");
        console.error("Error writing category budget to Firestore:", err);
        setDbError("Failed to sync category budget limit to the cloud database.");
      });

      return nextBudget;
    });
  };

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const matchesCategory = filterCategory === "All" || e.category === filterCategory;
        const matchesSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              e.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === "amount-desc") return b.amount - a.amount;
        if (sortBy === "amount-asc") return a.amount - b.amount;
        return 0;
      });
  }, [expenses, filterCategory, searchQuery, sortBy]);

  // Request AI Financial Tips from Express Backend
  const handleGenerateTips = async () => {
    setIsGeneratingTips(true);
    setTipsError("");
    setLoadingMessageIndex(0);

    try {
      const response = await fetch("/api/gemini/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget, expenses })
      });

      if (!response.ok) {
        let errorMessage = "Failed to generate financial recommendations.";
        try {
          const responseText = await response.text();
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            // Not a JSON response, use the plain text response if available (up to 200 chars to avoid massive HTML page output)
            errorMessage = responseText ? (responseText.length > 200 ? responseText.substring(0, 200) + "..." : responseText) : errorMessage;
          }
        } catch (readErr) {
          console.error("Error reading response body:", readErr);
        }
        throw new Error(errorMessage);
      }

      const data: FinancialHealthResponse = await response.json();
      setAiTips(data);
      localStorage.setItem("smartspend_aitips", JSON.stringify(data));
    } catch (err: any) {
      console.error(err);
      setTipsError(err.message || "An unexpected error occurred while communicating with the server.");
    } finally {
      setIsGeneratingTips(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/70 antialiased font-sans">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 bg-[#f9fbf9]/95 backdrop-blur border-b border-emerald-800/10 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo & Database Sync Indicators */}
          <div 
            onClick={() => setStarted(false)} 
            className="flex items-center gap-2.5 cursor-pointer group"
            id="header-logo"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shadow-md shadow-emerald-700/10 group-hover:scale-105 transition-transform">
              <PiggyBank className="w-5.5 h-5.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold font-display tracking-tight text-[#093c26] leading-none">
                SmartSpend
              </span>
              <div className="flex items-center gap-1 mt-1">
                {dbLoading ? (
                  <div className="flex items-center gap-1 text-[10px] text-sky-600 font-medium bg-sky-50 px-1.5 py-0.5 rounded-full border border-sky-100">
                    <RefreshCw className="w-2.5 h-2.5 text-sky-500 animate-spin" />
                    <span>Loading DB...</span>
                  </div>
                ) : dbError ? (
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                    <span>Sandbox Mode</span>
                  </div>
                ) : dbSaving ? (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                    <RefreshCw className="w-2.5 h-2.5 text-emerald-500 animate-spin" />
                    <span>Syncing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium bg-emerald-50/80 px-1.5 py-0.5 rounded-full border border-emerald-100/60">
                    <Database className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Cloud Database Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links (Faux navigation for marketing, switches views or scrolls) */}
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setStarted(false)} 
              className={`text-sm font-medium transition-colors ${!started ? "text-emerald-800 font-semibold" : "text-gray-500 hover:text-emerald-800"}`}
              id="nav-home"
            >
              Home
            </button>
            <button 
              onClick={() => { setStarted(true); setActiveTab("overview"); }}
              className={`text-sm font-medium transition-colors ${started && activeTab === "overview" ? "text-emerald-800 font-semibold" : "text-gray-500 hover:text-emerald-800"}`}
              id="nav-dashboard"
            >
              Dashboard
            </button>
            <button 
              onClick={() => { setStarted(true); setActiveTab("budgeting"); }}
              className={`text-sm font-medium transition-colors ${started && activeTab === "budgeting" ? "text-emerald-800 font-semibold" : "text-gray-500 hover:text-emerald-800"}`}
              id="nav-budgeting"
            >
              Set Budget
            </button>

          </nav>

          {/* Call To Action Buttons */}
          <div className="flex items-center gap-3">
            {!started ? (
              <button
                onClick={() => setStarted(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-700/10 hover:shadow-emerald-700/20 active:scale-[0.98]"
                id="btn-get-started"
              >
                Get Started
              </button>
            ) : (
              <button
                onClick={() => setStarted(false)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors border border-gray-200 bg-white"
                id="btn-back-home"
              >
                Go to Home
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          
          {!started ? (
            
            /* --- LANDING PAGE (HERO SECTION) --- */
            <motion.div
              key="landing-page"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                
                {/* Hero Left Content */}
                <div className="lg:col-span-7 flex flex-col items-start space-y-6 md:space-y-8">
                  
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold tracking-wide text-orange-800 uppercase shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                    Personal Finance Made Simple
                  </div>

                  {/* Headlines */}
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-none">
                    Your money, <br className="hidden sm:inline" />
                    <span className="text-emerald-700 font-display font-bold">organized</span>. <br />
                    Your future, <br className="hidden sm:inline" />
                    <span className="text-[#c25e3a] font-display font-bold">planned</span>.
                  </h1>

                  {/* Subtitle */}
                  <p className="text-lg md:text-xl text-gray-500 max-w-xl leading-relaxed">
                    SmartSpend helps you track expenses, set realistic budgets, and finally feel in control of your finances.
                  </p>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                    <button
                      onClick={() => setStarted(true)}
                      className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-all shadow-lg shadow-emerald-700/15 hover:shadow-emerald-700/25 active:scale-[0.99] text-base"
                      id="hero-btn-start"
                    >
                      Get Started Free
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setStarted(true);
                        setActiveTab("budgeting");
                      }}
                      className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white hover:bg-neutral-50 text-slate-800 font-bold transition-all border border-gray-200 shadow-sm active:scale-[0.99] text-base"
                      id="hero-btn-works"
                    >
                      See How It Works
                    </button>
                  </div>

                </div>

                {/* Hero Right Illustration */}
                <div className="lg:col-span-5 relative w-full flex justify-center">
                  <div className="relative w-full max-w-lg aspect-4/3 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-950/5 border border-emerald-800/10 bg-white p-2">
                    <img 
                      src={heroImage} 
                      alt="SmartSpend Financial Planning Illustration" 
                      className="w-full h-full object-cover rounded-2xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

              </div>

              {/* Responsive Features Matrix (Landing Page Footer) */}
              <div className="mt-20 md:mt-32 pt-12 border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  
                  {/* Feature 1 */}
                  <div className="p-6 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 mb-4">
                      <Sliders className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">1. Set your monthly budget</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Plan your monthly savings targets. Adjust visual sliders to establish spending limits across categories that map to your lifestyle.
                    </p>
                  </div>

                  {/* Feature 2 */}
                  <div className="p-6 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-[#c25e3a] mb-4">
                      <PieIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">2. Track your spending</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Log transactions instantly. Filter by date or description, and watch beautiful charts update instantly to review your budget balance.
                    </p>
                  </div>

                  {/* Feature 3 */}
                  <div className="p-6 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700 mb-4">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">3. Receive personalized money tips</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Get real-time, custom money-saving ideas tailored to your budget and actual transaction history, powered securely by server-side OpenAI GPT & Gemini AI.
                    </p>
                  </div>

                </div>
              </div>

            </motion.div>

          ) : (

            /* --- FULL APPLICATION WORKSPACE --- */
            <motion.div
              key="app-workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
            >
              {/* Back Button and Section Title Row */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                  <button
                    onClick={() => setStarted(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 mb-2 group transition-colors"
                  >
                    <span className="group-hover:-translate-x-0.5 transition-transform">&larr;</span> Back to Home
                  </button>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">
                    Personal Finance Manager
                  </h1>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    LIVE ACCOUNT: {localStorage.getItem("smartspend_expenses") ? "PRESERVED LOCALLY" : "SAMPLE DATA"}
                  </p>
                </div>

                {/* Workspace Tab Buttons */}
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-200/60 rounded-xl border border-slate-200 max-w-max self-start md:self-auto">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${activeTab === "overview" ? "bg-white text-emerald-800 shadow-sm" : "text-gray-600 hover:text-slate-900 hover:bg-slate-200/40"}`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab("budgeting")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${activeTab === "budgeting" ? "bg-white text-emerald-800 shadow-sm" : "text-gray-600 hover:text-slate-900 hover:bg-slate-200/40"}`}
                  >
                    Set Budget
                  </button>
                  <button
                    onClick={() => setActiveTab("transactions")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${activeTab === "transactions" ? "bg-white text-emerald-800 shadow-sm" : "text-gray-600 hover:text-slate-900 hover:bg-slate-200/40"}`}
                  >
                    Track Spending
                  </button>
                  <button
                    onClick={() => setActiveTab("ai-coach")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all inline-flex items-center gap-1.5 ${activeTab === "ai-coach" ? "bg-white text-emerald-800 shadow-sm font-semibold" : "text-gray-600 hover:text-slate-900 hover:bg-slate-200/40"}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    AI Coach
                  </button>

                </div>
              </div>

              {/* KPI Scoreboard cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                
                {/* Card 1: Overall Budget */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Monthly Budget</span>
                    <span className="text-2xl font-black font-mono text-slate-900">${budget.overall.toLocaleString()}</span>
                  </div>
                </div>

                {/* Card 2: Spending */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${totalSpent > budget.overall ? "bg-red-50 text-red-600" : "bg-orange-50 text-[#c25e3a]"}`}>
                    {totalSpent > budget.overall ? <AlertTriangle className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Total Spent</span>
                    <span className="text-2xl font-black font-mono text-slate-900">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Card 3: Remaining */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${(budget.overall - totalSpent) < 0 ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"}`}>
                    <PiggyBank className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Remaining Balance</span>
                    <span className={`text-2xl font-black font-mono ${(budget.overall - totalSpent) < 0 ? "text-red-600" : "text-slate-900"}`}>
                      ${(budget.overall - totalSpent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Card 4: Progress Indicator */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-center">
                  <div className="flex items-center justify-between text-xs font-medium text-gray-500 uppercase tracking-wider mb-2.5">
                    <span>Budget Consumed</span>
                    <span className="font-mono text-slate-900 font-bold">{budgetProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${budgetProgress > 90 ? "bg-red-500" : budgetProgress > 75 ? "bg-amber-500" : "bg-emerald-600"}`}
                      style={{ width: `${budgetProgress}%` }}
                    ></div>
                  </div>
                </div>

              </div>

              {/* Workspace Content Tabs */}
              <div className="grid grid-cols-1 gap-8">
                
                {/* ================== TAB 1: OVERVIEW ================== */}
                {activeTab === "overview" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      
                      {/* Chart Left: Budget vs Actual bar chart */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-lg font-bold text-slate-900">Category Comparison</h2>
                            <p className="text-xs text-gray-400">Budget vs actual spending limits</p>
                          </div>
                          <div className="flex gap-4 text-xs font-medium">
                            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs block"></span>Budget</span>
                            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#c25e3a] rounded-xs block"></span>Actual</span>
                          </div>
                        </div>
                        
                        <div className="h-76 w-full text-xs">
                          {categoryCompareData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400 font-medium">
                              No budget parameters defined. Please add category allocations in Set Budget tab.
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={categoryCompareData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: "#1e293b", color: "#f8fafc", borderRadius: "12px", border: "none" }}
                                  cursor={{ fill: "rgba(0, 0, 0, 0.03)" }}
                                />
                                <Bar dataKey="Budget" fill="#0e7e53" radius={[4, 4, 0, 0]} barSize={16} />
                                <Bar dataKey="Actual" fill="#c25e3a" radius={[4, 4, 0, 0]} barSize={16} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>

                      {/* Chart Right: Pie breakdown of spending */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-grow w-full md:w-auto">
                          <h2 className="text-lg font-bold text-slate-900 mb-1">Spending Breakdown</h2>
                          <p className="text-xs text-gray-400 mb-6">Distribution of your actual expenditures</p>
                          
                          <div className="h-60 w-full text-xs relative">
                            {categorySpending.length === 0 ? (
                              <div className="h-full flex items-center justify-center text-gray-400 font-medium">
                                No spending logged yet. Add your expenses in Track Spending tab.
                              </div>
                            ) : (
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={categorySpending}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                  >
                                    {categorySpending.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", color: "#f8fafc", borderRadius: "12px", border: "none" }} />
                                </PieChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </div>

                        {/* Pie Legend List */}
                        <div className="w-full md:w-52 space-y-2 max-h-64 overflow-y-auto pr-2">
                          {categorySpending.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                              <span className="flex items-center gap-1.5 font-medium text-slate-700 truncate max-w-32">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                                {item.name}
                              </span>
                              <span className="font-mono text-slate-500 font-medium">${item.value.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                      </div>

                    </div>

                    {/* Quick Add and Recent Spending split */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      
                      {/* Left: Quick Log form */}
                      <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-150 shadow-xs self-start">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-bold text-slate-900">Quick Expense Log</h2>
                          <span className="p-1 rounded-md bg-emerald-50 text-emerald-800"><Plus className="w-4 h-4" /></span>
                        </div>
                        
                        <form onSubmit={handleAddExpense} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Amount ($)</label>
                            <div className="relative">
                              <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={newAmount}
                                onChange={(e) => setNewAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50/50 focus:bg-white focus:outline-emerald-700 focus:ring-1 focus:ring-emerald-700 transition-all font-mono font-medium text-slate-800"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Category</label>
                            <select
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50/50 focus:bg-white focus:outline-emerald-700 transition-all text-sm text-slate-800 font-medium"
                            >
                              {CATEGORIES.map((c, i) => (
                                <option key={i} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Date</label>
                              <input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-slate-50/50 focus:bg-white focus:outline-emerald-700 transition-all text-xs font-medium text-slate-800"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Description</label>
                              <input
                                type="text"
                                placeholder="e.g., Lunch, Uber"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-slate-50/50 focus:bg-white focus:outline-emerald-700 transition-all text-xs text-slate-800 font-medium"
                                required
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3 rounded-xl bg-[#0e7e53] hover:bg-[#093c26] text-white font-bold text-xs tracking-wider uppercase transition-colors shadow-md shadow-emerald-800/10 active:scale-[0.98]"
                          >
                            Log Transaction
                          </button>
                        </form>
                      </div>

                      {/* Right: Recent list */}
                      <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-150 shadow-xs">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
                            <p className="text-xs text-gray-400">Your latest logged spendings</p>
                          </div>
                          <button
                            onClick={() => setActiveTab("transactions")}
                            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 transition-colors inline-flex items-center gap-1"
                          >
                            View All <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="divide-y divide-gray-100 max-h-[380px] overflow-y-auto pr-2">
                          {expenses.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 font-medium">
                              No expenditures tracked this month yet. Use the Quick Log panel to add one!
                            </div>
                          ) : (
                            expenses.slice(0, 6).map((item) => {
                              const categoryMeta = CATEGORIES.find(c => c.name === item.category);
                              const IconComponent = categoryMeta?.icon || MoreHorizontal;
                              
                              return (
                                <div key={item.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-neutral-50/60 px-2 rounded-xl transition-colors">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div 
                                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                      style={{ backgroundColor: categoryMeta?.lightColor || "#f3f4f6", color: categoryMeta?.color || "#4b5563" }}
                                    >
                                      <IconComponent className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-semibold text-slate-800 truncate">{item.description}</h4>
                                      <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mt-0.5">
                                        <span>{item.category}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>{item.date}</span>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm font-bold text-slate-800">
                                      -${Number(item.amount).toFixed(2)}
                                    </span>
                                    <button
                                      onClick={() => handleRemoveExpense(item.id)}
                                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete transaction"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                    </div>

                    {/* AI Coach Callout Widget */}
                    <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white p-6 md:p-8 rounded-3xl border border-emerald-900 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden mt-8">
                      <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-emerald-700/10 rounded-full blur-2xl"></div>
                      <div className="absolute left-1/3 bottom-0 translate-y-12 w-32 h-32 bg-amber-500/10 rounded-full blur-xl"></div>
                      
                      <div className="space-y-2 max-w-xl">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-bold tracking-wider uppercase border border-amber-500/20">
                          <Sparkle className="w-3 h-3 fill-amber-300 text-amber-300" />
                          OpenAI GPT & Gemini Coach Chat
                        </span>
                        <h2 className="text-2xl font-black tracking-tight font-display">Need helper strategies to beat overspending?</h2>
                        <p className="text-sm text-emerald-100/90 leading-relaxed font-sans">
                          Ask your custom budget questions and get instant, tailored advice on purchase decisions and smart ways to spend!
                        </p>
                      </div>

                      <button
                        onClick={() => { setActiveTab("ai-coach"); }}
                        className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-[#093c26] font-extrabold text-sm tracking-wide transition-all shadow-md active:scale-[0.98] self-start md:self-auto inline-flex items-center gap-2 flex-shrink-0 cursor-pointer font-sans"
                      >
                        <Sparkles className="w-4.5 h-4.5 fill-[#093c26]" />
                        Consult Coach
                      </button>
                    </div>

                  </motion.div>
                )}

                {/* ================== TAB 2: BUDGETING ================== */}
                {activeTab === "budgeting" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-150 shadow-xs">
                      <h2 className="text-xl font-bold text-slate-900 mb-2">Set Your Budgets</h2>
                      <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                        Configure your overall monthly spending ceiling, followed by individual limits for specific expense categories. We will utilize these thresholds to chart and flag any warning states.
                      </p>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* Overall target panel */}
                        <div className="lg:col-span-5 bg-[#f9fbf9] p-6 rounded-2xl border border-emerald-800/10 space-y-6">
                          <div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                              <PiggyBank className="w-4 h-4" />
                              Overall Monthly Ceiling
                            </span>
                            <p className="text-xs text-gray-400 leading-relaxed mb-4">
                              Your master budget parameter for the calendar month.
                            </p>
                            
                            <div className="relative">
                              <span className="absolute left-4 top-3.5 text-lg font-black text-emerald-800 font-mono">$</span>
                              <input
                                type="number"
                                value={budget.overall}
                                onChange={(e) => handleUpdateOverallBudget(parseFloat(e.target.value) || 0)}
                                className="w-full pl-8 pr-4 py-3 bg-white border border-emerald-800/20 focus:outline-emerald-700 rounded-xl text-xl font-mono font-bold text-[#093c26]"
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Quick Presets</span>
                            <div className="grid grid-cols-3 gap-2">
                              {[1500, 2000, 2500, 3000, 4000, 5000].map((amt) => (
                                <button
                                  key={amt}
                                  onClick={() => handleUpdateOverallBudget(amt)}
                                  className={`py-2 px-1 rounded-lg text-xs font-bold font-mono transition-colors ${budget.overall === amt ? "bg-emerald-750 text-white" : "bg-white hover:bg-slate-100 border border-slate-200 text-slate-700"}`}
                                  style={budget.overall === amt ? { backgroundColor: "#0e7e53" } : {}}
                                >
                                  ${amt}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2 pt-4 border-t border-slate-200">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-500 uppercase tracking-wider">Total Allocated</span>
                              <span className="font-mono text-slate-800">${totalCategorized.toLocaleString()} / ${budget.overall.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden animate-pulse-slow">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${totalCategorized > budget.overall ? "bg-red-500" : totalCategorized === budget.overall ? "bg-emerald-600" : "bg-emerald-500"}`}
                                style={{ width: `${Math.min(100, (totalCategorized / (budget.overall || 1)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-3">
                            <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-orange-800 leading-relaxed font-medium">
                              Your category allocation total should ideally remain within your overall monthly budget target to satisfy safe savings parameters.
                            </div>
                          </div>
                        </div>

                        {/* Categories allocation settings */}
                        <div className="lg:col-span-7 space-y-6">
                          <div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Category Spending Limits</span>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Fine-tune individual thresholds. Scroll down and slide or type custom allocations.
                            </p>
                          </div>

                          {/* Distribution Summary Callout */}
                          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                            remainingToDistribute < 0 
                              ? "bg-red-50/70 border-red-200 text-red-900" 
                              : remainingToDistribute === 0 
                                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" 
                                : "bg-sky-50/70 border-sky-200 text-sky-900"
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                remainingToDistribute < 0 
                                  ? "bg-red-100 text-red-700" 
                                  : remainingToDistribute === 0 
                                    ? "bg-emerald-100 text-emerald-700" 
                                    : "bg-sky-100 text-sky-700"
                              }`}>
                                {remainingToDistribute < 0 ? (
                                  <AlertTriangle className="w-5 h-5" />
                                ) : (
                                  <Sparkles className="w-5 h-5" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold uppercase tracking-wider block opacity-75">
                                  Distribution Balance
                                </span>
                                <span className="text-xs font-medium leading-normal block">
                                  {remainingToDistribute < 0 ? (
                                    <>You have overallocated by <span className="font-bold">${Math.abs(remainingToDistribute).toLocaleString()}</span> over your master budget limit.</>
                                  ) : remainingToDistribute === 0 ? (
                                    <>Perfect! You have fully distributed your master budget limit across categories.</>
                                  ) : (
                                    <>You have <span className="font-bold">${remainingToDistribute.toLocaleString()}</span> remaining to allocate to other categories.</>
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-start sm:items-end sm:text-right flex-shrink-0">
                              <span className="text-xl font-mono font-bold">
                                ${remainingToDistribute.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                                {remainingToDistribute < 0 ? "Over-allocated" : "Left to Distribute"}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                            {CATEGORIES.map((cat) => {
                              const existingBudget = budget.categories.find(c => c.category === cat.name)?.amount || 0;
                              const IconComponent = cat.icon;
                              
                              return (
                                <div key={cat.name} className="p-4 rounded-xl border border-gray-100 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div 
                                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                                      style={{ backgroundColor: cat.color }}
                                    >
                                      <IconComponent className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 truncate">{cat.name}</span>
                                  </div>

                                  <div className="flex items-center gap-4 w-full sm:w-60 justify-end">
                                    {/* Slider */}
                                    <input
                                      type="range"
                                      min="0"
                                      max="1500"
                                      step="50"
                                      value={existingBudget}
                                      onChange={(e) => handleUpdateCategoryBudget(cat.name, parseFloat(e.target.value) || 0)}
                                      className="w-24 sm:w-32 accent-emerald-700 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                                    />
                                    {/* Number Input */}
                                    <div className="relative w-24">
                                      <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400 font-mono">$</span>
                                      <input
                                        type="number"
                                        value={existingBudget || ""}
                                        onChange={(e) => handleUpdateCategoryBudget(cat.name, parseFloat(e.target.value) || 0)}
                                        className="w-full pl-6 pr-2 py-1.5 text-xs text-right font-mono font-bold text-slate-800 border border-gray-200 rounded-lg focus:outline-emerald-700"
                                        placeholder="0"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ================== TAB 3: TRANSACTIONS ================== */}
                {activeTab === "transactions" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Add Transaction Accordion Form */}
                    <div className="bg-white rounded-2xl border border-slate-150 shadow-xs overflow-hidden">
                      <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="w-full p-5 flex items-center justify-between font-bold text-slate-800 hover:bg-slate-50/50 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <Plus className="w-5 h-5 text-emerald-700" />
                          Track New Spending Event
                        </span>
                        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showAddForm ? "rotate-90" : ""}`} />
                      </button>

                      <AnimatePresence>
                        {showAddForm && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-100 bg-[#f9fbf9]/30"
                          >
                            <form onSubmit={handleAddExpense} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                              <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Amount ($)</label>
                                <div className="relative">
                                  <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={newAmount}
                                    onChange={(e) => setNewAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-emerald-700 font-mono font-semibold text-slate-800 text-sm"
                                    required
                                  />
                                </div>
                              </div>

                              <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Category</label>
                                <select
                                  value={newCategory}
                                  onChange={(e) => setNewCategory(e.target.value)}
                                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-emerald-700 text-sm text-slate-800 font-medium"
                                >
                                  {CATEGORIES.map((c, i) => (
                                    <option key={i} value={c.name}>{c.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Date</label>
                                <input
                                  type="date"
                                  value={newDate}
                                  onChange={(e) => setNewDate(e.target.value)}
                                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-emerald-700 text-xs font-medium text-slate-800"
                                  required
                                />
                              </div>

                              <div className="md:col-span-4">
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Description</label>
                                <input
                                  type="text"
                                  placeholder="e.g., Gas refill, Grocery Outlet"
                                  value={newDescription}
                                  onChange={(e) => setNewDescription(e.target.value)}
                                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-emerald-700 text-sm text-slate-800 font-medium"
                                  required
                                />
                              </div>

                              <div className="md:col-span-12 flex justify-end gap-3 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setShowAddForm(false)}
                                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-emerald-800/10"
                                >
                                  Save Transaction
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Filter and List Container */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs">
                      
                      {/* Filter Controls Row */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Search */}
                          <div className="relative w-full sm:w-56">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                            <input
                              type="text"
                              placeholder="Search description..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-emerald-700 transition-all focus:bg-white"
                            />
                          </div>

                          {/* Category select filter */}
                          <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-emerald-700"
                          >
                            <option value="All">All Categories</option>
                            {CATEGORIES.map((c, i) => (
                              <option key={i} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Sort select */}
                        <div className="flex items-center gap-2 self-end md:self-auto">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sort by</span>
                          <select
                            value={sortBy}
                            onChange={(e: any) => setSortBy(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-emerald-700"
                          >
                            <option value="date-desc">Newest First</option>
                            <option value="date-asc">Oldest First</option>
                            <option value="amount-desc">Highest Amount</option>
                            <option value="amount-asc">Lowest Amount</option>
                          </select>
                        </div>
                      </div>

                      {/* Transaction Table list */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-xs text-gray-400 font-bold uppercase tracking-wider">
                              <th className="pb-3 pl-2">Transaction</th>
                              <th className="pb-3">Category</th>
                              <th className="pb-3">Date</th>
                              <th className="pb-3 text-right">Amount</th>
                              <th className="pb-3 text-center w-20">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredExpenses.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-gray-400 font-medium">
                                  No transaction history matches your filters.
                                </td>
                              </tr>
                            ) : (
                              filteredExpenses.map((e) => {
                                const catMeta = CATEGORIES.find(c => c.name === e.category);
                                const IconComponent = catMeta?.icon || MoreHorizontal;
                                
                                return (
                                  <tr key={e.id} className="hover:bg-neutral-50/60 transition-colors group">
                                    <td className="py-3.5 pl-2 font-semibold text-slate-800">
                                      {e.description}
                                    </td>
                                    <td className="py-3.5">
                                      <span 
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                                        style={{ backgroundColor: catMeta?.lightColor || "#f3f4f6", color: catMeta?.color || "#4b5563" }}
                                      >
                                        <IconComponent className="w-3.5 h-3.5" />
                                        {e.category}
                                      </span>
                                    </td>
                                    <td className="py-3.5 text-gray-400 font-medium text-xs font-mono">
                                      {e.date}
                                    </td>
                                    <td className="py-3.5 text-right font-mono font-bold text-slate-800 text-sm">
                                      -${Number(e.amount).toFixed(2)}
                                    </td>
                                    <td className="py-3.5 text-center">
                                      <button
                                        onClick={() => handleRemoveExpense(e.id)}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete transaction"
                                      >
                                        <Trash2 className="w-4.5 h-4.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  </motion.div>
                )}

                {/* ================== TAB 4: AI COACH CHAT ================== */}
                {activeTab === "ai-coach" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                  >
                    {/* Left Column: Context & Suggest Questions */}
                    <div className="lg:col-span-4 space-y-6">
                      
                      {/* Coach Bio Card */}
                      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-6 rounded-3xl border border-emerald-900 shadow-lg relative overflow-hidden">
                        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-32 h-32 bg-emerald-700/20 rounded-full blur-xl"></div>
                        
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-[#093c26]">
                            <Sparkles className="w-5.5 h-5.5 fill-[#093c26]" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base font-display text-white">AI Money Coach</h3>
                            <span className="text-[10px] text-amber-300 font-bold tracking-wider uppercase">Personal Financial Advisor</span>
                          </div>
                        </div>

                        <p className="text-xs text-emerald-100/90 leading-relaxed mb-4 font-sans">
                          I can evaluate your real-time spending to help you make smart purchase decisions and find where you can save.
                        </p>

                        {/* Real-time sync badge */}
                        <div className="pt-4 border-t border-emerald-750/60 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                          <span className="text-[10px] text-emerald-200 font-mono">
                            Syncing with your current budget
                          </span>
                        </div>
                      </div>

                      {/* Quick decision-making prompts */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Suggested Questions
                        </h4>
                        
                        <div className="space-y-2">
                          {[
                            "Should I buy a new phone this month?",
                            "How can I cut back on my food & dining expenses?",
                            "Give me a structured weekly budget plan.",
                            "What are 3 smart ways to save money based on my spending?"
                          ].map((promptText, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setChatInput(promptText);
                              }}
                              className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-emerald-500/30 hover:bg-emerald-50/20 text-xs text-slate-700 font-medium transition-all group flex items-start gap-2.5 cursor-pointer"
                            >
                              <ArrowRight className="w-3.5 h-3.5 text-emerald-600 mt-0.5 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                              <span className="font-sans">{promptText}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reset Conversation Button */}
                      <button
                        onClick={handleClearChatHistory}
                        className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50/20 transition-all cursor-pointer text-center block"
                      >
                        Reset Conversation History
                      </button>

                    </div>

                    {/* Right Column: Chat Interface */}
                    <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-150 shadow-xs overflow-hidden flex flex-col h-[600px]">
                      
                      {/* Chat Header */}
                      <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                            <Sparkle className="w-4.5 h-4.5 fill-emerald-800" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-800 block">Consult AI Coach</span>
                            <span className="text-[10px] text-gray-400 font-medium">Powered securely by OpenAI GPT-4o & Gemini</span>
                          </div>
                        </div>

                        {/* Status bar */}
                        <span className="text-[10px] font-mono text-gray-400">
                          {chatHistory.length} messages
                        </span>
                      </div>

                      {/* Chat Thread */}
                      <div className="flex-grow p-6 overflow-y-auto space-y-4" id="chat-thread-container">
                        {chatHistory.map((msg) => {
                          const isUser = msg.role === "user";
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-3`}
                            >
                              {!isUser && (
                                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-100 shadow-xs">
                                  <Sparkles className="w-4 h-4 fill-emerald-700" />
                                </div>
                              )}

                              <div className={`max-w-[80%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                                <div
                                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                                    isUser
                                      ? "bg-emerald-750 text-white rounded-tr-none shadow-xs font-sans"
                                      : "bg-slate-100/80 text-slate-800 rounded-tl-none border border-slate-200/50 font-sans"
                                  }`}
                                  style={isUser ? { backgroundColor: "#0e7e53" } : {}}
                                >
                                  {/* Render message formatting nicely */}
                                  <div className="whitespace-pre-line">
                                    {msg.text}
                                  </div>
                                </div>
                                <span className="text-[9px] font-medium text-gray-400 mt-1 px-1">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              {isUser && (
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0 border border-slate-200 shadow-xs font-bold text-xs uppercase">
                                  ME
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* AI Typing Indicator */}
                        {isSendingChat && (
                          <div className="flex justify-start items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-100 shadow-xs animate-pulse">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="bg-slate-100/80 border border-slate-200/50 p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5 max-w-[120px]">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                            </div>
                          </div>
                        )}

                        {/* Chat Error presentation */}
                        {chatError && (
                          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-red-800 leading-relaxed font-medium">
                              {chatError}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chat Input Area */}
                      <form
                        onSubmit={handleSendChatMessage}
                        className="p-4 border-t border-slate-150 bg-slate-50/50 flex gap-2.5 items-center"
                      >
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask the AI Coach... (e.g., Should I buy a smart TV?)"
                          disabled={isSendingChat}
                          className="flex-grow bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-60"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim() || isSendingChat}
                          className="p-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 text-white disabled:text-gray-400 rounded-xl transition-all shadow-md active:scale-95 flex-shrink-0 flex items-center justify-center cursor-pointer"
                          style={chatInput.trim() && !isSendingChat ? { backgroundColor: "#0e7e53" } : {}}
                        >
                          <Send className="w-4.5 h-4.5" />
                        </button>
                      </form>

                    </div>
                  </motion.div>
                )}



              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Persistent Footer */}
      <footer className="bg-white border-t border-slate-150 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white">
              <PiggyBank className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-800 tracking-tight">SmartSpend</span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs font-medium text-gray-500">
            <button onClick={() => setStarted(false)} className="hover:text-emerald-800 transition-colors">Home</button>
            <button onClick={() => { setStarted(true); setActiveTab("overview"); }} className="hover:text-emerald-800 transition-colors">Workspace</button>
            <button onClick={() => { setStarted(true); setActiveTab("budgeting"); }} className="hover:text-emerald-800 transition-colors">Budgets</button>
            <button onClick={() => { setStarted(true); setActiveTab("transactions"); }} className="hover:text-emerald-800 transition-colors">Transactions</button>
            <button onClick={() => { setStarted(true); setActiveTab("ai-coach"); }} className="hover:text-emerald-800 transition-colors">AI Coach</button>
          </div>

          <span className="text-xs text-gray-400">
            &copy; 2026 SmartSpend. All rights reserved.
          </span>
        </div>
      </footer>

    </div>
  );
}
