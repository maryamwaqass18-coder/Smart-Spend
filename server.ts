import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize Gemini API (lazy initialized and guarded)
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || "MOCK_KEY", // Provide a fallback during startup checks if key is missing
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

  // API endpoints
  app.post("/api/gemini/tips", async (req, res) => {
    try {
      const { budget, expenses } = req.body;

      if (!apiKey) {
        return res.status(400).json({
          error: "Please set your GEMINI_API_KEY secret in Settings > Secrets to receive personalized AI financial tips."
        });
      }

      // Calculate summary statistics to supply high-quality context to Gemini
      const totalBudget = budget.overall;
      const totalSpent = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
      
      const categorySpendMap: Record<string, number> = {};
      expenses.forEach((e: any) => {
        categorySpendMap[e.category] = (categorySpendMap[e.category] || 0) + Number(e.amount);
      });

      const categoryBudgetsMap: Record<string, number> = {};
      budget.categories.forEach((c: any) => {
        categoryBudgetsMap[c.category] = Number(c.amount);
      });

      const dataPayload = {
        totalBudget,
        totalSpent,
        categoryBudgets: budget.categories,
        actualSpending: Object.keys(categorySpendMap).map(cat => ({
          category: cat,
          spent: categorySpendMap[cat],
          budget: categoryBudgetsMap[cat] || 0
        })),
        recentExpenses: expenses.slice(-12).map((e: any) => ({
          amount: e.amount,
          category: e.category,
          date: e.date,
          description: e.description
        }))
      };

      const prompt = `Analyze the user's monthly budget and spending profile to provide highly personalized, realistic, and actionable money-saving tips and financial advice.
User's Financial Profile:
${JSON.stringify(dataPayload, null, 2)}

Requirements:
1. Provide a financial health score (0-100) based on how well they are sticking to their budget (higher is better, lower if they are significantly over or have exceeded multiple category caps).
2. Write a clear, encouraging but honest overall assessment (2-3 sentences) of their current spending.
3. Provide exactly 3 or 4 custom tips. Each tip must target specific categories (especially where they are overspending or close to the limit) or general behavioral advice.
4. Set the urgency for each tip ("high", "medium", or "low") based on the budget overage.
5. Provide a short, motivating, positive encouraging closing sentence.

Ensure you return a clean, valid JSON matching the requested schema. No conversational wrapper or markdown backticks outside of the JSON representation.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.INTEGER,
                description: "The financial health score (0 to 100)"
              },
              assessment: {
                type: Type.STRING,
                description: "Honest and supportive assessment of their current spending habits."
              },
              tips: {
                type: Type.ARRAY,
                description: "Array of exactly 3 to 4 personalized actionable tips.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "A catchy, short tip title." },
                    advice: { type: Type.STRING, description: "Specific advice explaining what the user should do and why." },
                    category: { type: Type.STRING, description: "The specific category this tip targets, if applicable (e.g., Food & Dining)." },
                    urgency: { type: Type.STRING, description: "Urgency level of this tip: high, medium, or low." }
                  },
                  required: ["title", "advice", "urgency"]
                }
              },
              encouragement: {
                type: Type.STRING,
                description: "A short, encouraging closing sentence."
              }
            },
            required: ["score", "assessment", "tips", "encouragement"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response text received from Gemini API");
      }

      const parsedData = JSON.parse(responseText.trim());
      res.json(parsedData);
    } catch (error: any) {
      console.error("Error generating budget tips:", error);
      res.status(500).json({ error: error.message || "Failed to generate financial tips." });
    }
  });

  // Serve Vite in development, static files in production
  async function setupServer() {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    // Only listen if not running on Vercel
    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  }

  setupServer().catch(err => {
    console.error("Failed to setup server:", err);
  });

  export default app;
