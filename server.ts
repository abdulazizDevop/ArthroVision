import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(cors());
  app.use(express.json());

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({ storage });

  // Serve uploaded files statically
  app.use("/uploads", express.static(uploadsDir));

  // API Routes
  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
    });
  });

  app.delete("/api/upload/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  const LANGUAGE_NAMES: Record<string, string> = {
    uz: "Uzbek (Latin script)",
    ru: "Russian",
    en: "English",
  };

  app.post("/api/analyze", async (req, res) => {
    try {
      const { language, patientData, clinicalData, labData, imagingData, das28Score } = req.body;
      const langCode: string = ["uz", "ru", "en"].includes(language) ? language : "uz";
      const languageName = LANGUAGE_NAMES[langCode];

      const prompt = `
        You are an AI clinical decision support system for Rheumatoid Arthritis.
        Analyze the following patient data and provide a structured classification and recommendations.

        CRITICAL RULES:
        - DO NOT provide a definitive diagnosis.
        - DO NOT provide drug dosages or prescriptions.
        - Frame everything as "suggestive of" or "consistent with".

        Patient Data:
        - Age: ${patientData.age}
        - Sex: ${patientData.sex}
        - BMI: ${patientData.bmi}
        - Complaints: ${patientData.complaints}
        - History: ${patientData.history}

        Clinical Data:
        - Morning Stiffness: ${clinicalData.morningStiffness} mins
        - TJC28: ${clinicalData.tjc28}
        - SJC28: ${clinicalData.sjc28}
        - Patient Global Assessment (VAS): ${clinicalData.vas}

        Lab Data:
        - ESR: ${labData.esr.value}
        - CRP: ${labData.crp.value}
        - RF: ${labData.rf.value}
        - Anti-CCP: ${labData.antiCcp.value}

        Imaging Data:
        - Steinbrocker Stage: ${imagingData.steinbrockerStage}

        Calculated DAS28: ${das28Score?.score ?? "N/A"} (${das28Score?.interpretation ?? "N/A"})

        IMPORTANT: Write ALL values in the output in ${languageName}. JSON keys must stay in English.
        Respond with valid JSON only, using this exact structure:
        {
          "classification": {
            "diagnosisPattern": "...",
            "diseaseStage": "...",
            "diseaseActivity": "...",
            "extraArticular": "...",
            "structuralDamage": "...",
            "immunology": "...",
            "functionalClass": "...",
            "complications": "..."
          },
          "recommendations": {
            "treatmentCategories": ["..."],
            "diagnosticTests": ["..."],
            "monitoringStrategy": "...",
            "lifestyle": ["..."]
          }
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const resultText = response.choices[0]?.message?.content;
      if (!resultText) {
        throw new Error("No response from AI");
      }

      const result = JSON.parse(resultText);
      res.json(result);
    } catch (error) {
      console.error("Error analyzing data:", error);
      res.status(500).json({ error: "Failed to analyze data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
