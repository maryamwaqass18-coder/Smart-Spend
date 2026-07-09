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
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

  // API endpoints
  app.post("/api/gemini/tips", async (req, res) => {
    try {
      console.log("POST /api/gemini/tips called");
      const { budget, expenses } = req.body;

      if (!budget || !expenses) {
        console.warn("Invalid payload: budget or expenses missing");
        return res.status(400).json({
          error: "Invalid request. Please ensure you have configured your budget and have at least one expense record."
        });
      }

      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        console.warn("GEMINI_API_KEY environment variable not set");
        return res.status(400).json({
          error: "Please set your GEMINI_API_KEY secret in Settings > Secrets to receive personalized AI financial tips."
        });
      }

      const ai = getGeminiClient();

      // Calculate summary statistics defensively to supply high-quality context to Gemini
      const totalBudget = Number(budget.overall || 0);
      const expensesList = Array.isArray(expenses) ? expenses : [];
      const totalSpent = expensesList.reduce((sum: number, e: any) => sum + Number(e?.amount || 0), 0);
      
      const categorySpendMap: Record<string, number> = {};
      expensesList.forEach((e: any) => {
        if (e && e.category) {
          categorySpendMap[e.category] = (categorySpendMap[e.category] || 0) + Number(e.amount || 0);
        }
      });

      const categoryBudgetsMap: Record<string, number> = {};
      const budgetCategories = Array.isArray(budget.categories) ? budget.categories : [];
      budgetCategories.forEach((c: any) => {
        if (c && c.category) {
          categoryBudgetsMap[c.category] = Number(c.amount || 0);
        }
      });

      const dataPayload = {
        totalBudget,
        totalSpent,
        categoryBudgets: budgetCategories,
        actualSpending: Object.keys(categorySpendMap).map(cat => ({
          category: cat,
          spent: categorySpendMap[cat],
          budget: categoryBudgetsMap[cat] || 0
        })),
        recentExpenses: expensesList.slice(-12).map((e: any) => ({
          amount: Number(e?.amount || 0),
          category: e?.category || "Other",
          date: e?.date || "",
          description: e?.description || ""
        }))
      };

      console.log("Analyzing spend profile payload:", JSON.stringify(dataPayload));

      const prompt = `Analyze the user's monthly budget and spending profile to provide highly personalized, realistic, and actionable money-saving tips and financial advice.
User's Financial Profile:
${JSON.stringify(dataPayload, null, 2)}

Requirements:
1. Provide a financial health score (0-100) based on how well they are sticking to their budget (higher is better, lower if they are significantly over or have exceeded multiple category caps).
2. Write a clear, encouraging but honest overall assessment (exactly 2 sentences) of their current spending.
3. Provide exactly 3 custom tips. Be extremely concise in your advice (maximum 2 sentences per tip) to keep response fast. Each tip must target specific categories (especially where they are overspending or close to the limit) or general behavioral advice.
4. Set the urgency for each tip ("high", "medium", or "low") based on the budget overage.
5. Provide a short, motivating, positive encouraging closing sentence.

Ensure you return a clean, valid JSON matching the requested schema. No conversational wrapper or markdown backticks outside of the JSON representation.`;

      console.log("Invoking Google GenAI API...");
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite", // Much faster latency to prevent Vercel 10s timeout
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
                description: "Array of exactly 3 personalized actionable tips.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "A catchy, short tip title." },
                    advice: { type: Type.STRING, description: "Specific advice explaining what the user should do and why. Be very brief (max 2 sentences)." },
                    category: { type: Type.STRING, description: "The specific category this tip targets, if applicable." },
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

      console.log("Google GenAI API call returned successfully.");
      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response text received from Gemini API");
      }

      const parsedData = JSON.parse(responseText.trim());
      console.log("Successfully parsed Gemini response:", JSON.stringify(parsedData));
      res.json(parsedData);
    } catch (error: any) {
      console.error("Error generating budget tips:", error);
      res.status(500).json({ error: error.message || "Failed to generate financial tips." });
    }
  });

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      console.log("POST /api/gemini/chat called");
      const { history, message, budget, expenses } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        return res.status(400).json({
          error: "Please set your GEMINI_API_KEY secret in Settings > Secrets to use the AI Coach chat."
        });
      }

      const ai = getGeminiClient();

      let contextStr = "";
      if (budget && expenses) {
        const totalBudget = Number(budget.overall || 0);
        const expensesList = Array.isArray(expenses) ? expenses : [];
        const totalSpent = expensesList.reduce((sum: number, e: any) => sum + Number(e?.amount || 0), 0);
        const remaining = totalBudget - totalSpent;

        const categorySpendMap: Record<string, number> = {};
        expensesList.forEach((e: any) => {
          if (e && e.category) {
            categorySpendMap[e.category] = (categorySpendMap[e.category] || 0) + Number(e.amount || 0);
          }
        });

        contextStr = `\n\nUser's Current Real-Time Financial Context:
- Monthly Budget Target: $${totalBudget}
- Total Spent So Far: $${totalSpent}
- Remaining Balance: $${remaining}
- Categorized Spending:
${Object.entries(categorySpendMap).map(([cat, spent]) => `  * ${cat}: $${spent}`).join("\n")}`;
      }

      const systemInstruction = `You are the "SmartSpend AI Money Coach," an encouraging, highly professional, and supportive personal finance advisor.
Your goal is to guide the user in making better spending decisions, finding smart ways to save money, and answering financial questions.

Be specific and practical in your advice. Feel free to reference the user's current budget and expenses if provided.
When asked about purchasing decisions (e.g., "Should I buy a new phone?"), help them weigh the pros and cons based on their remaining budget, and propose alternative strategies (like saving over 3 months, or delaying the purchase).
Keep responses friendly, helpful, relatively concise (2-4 sentences per point, avoiding massive paragraphs), and well-structured with formatting or bullet points where appropriate.${contextStr}`;

      const formattedHistory = Array.isArray(history) ? history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: Array.isArray(h.parts) ? h.parts.map((p: any) => ({ text: p.text || "" })) : [{ text: String(h) }]
      })) : [];

      const contents = [
        ...formattedHistory,
        { role: "user", parts: [{ text: message }] }
      ];

      console.log(`Invoking Google GenAI API for chat. Message count in session: ${contents.length}`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
        }
      });

      console.log("Google GenAI chat response generated.");
      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response text received from Gemini API");
      }

      res.json({ text: responseText });
    } catch (error: any) {
      console.error("Error in AI Coach chat:", error);
      res.status(500).json({ error: error.message || "Failed to process chat message." });
    }
  });

  // Serve Vite in development, static files in production
  async function setupServer() {
    if (process.env.NODE_ENV !== "production") {
      const viteModule = "vite";
      const { createServer: createViteServer } = await import(viteModule);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else if (!process.env.VERCEL) {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    // Listen on the port if we are not on Vercel
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }

  // Only setup/listen if not running on Vercel
  if (!process.env.VERCEL) {
    setupServer().catch(err => {
      console.error("Failed to setup server:", err);
    });
  }

  export default app;
