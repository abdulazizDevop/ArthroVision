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
  const INSUFFICIENT_DATA_PHRASE: Record<string, string> = {
    uz: "Ma'lumot yetarli emas",
    ru: "Недостаточно данных",
    en: "Insufficient data",
  };

  const orDash = (v: unknown) =>
    v === undefined || v === null || v === "" ? "—" : String(v);

  app.post("/api/analyze", async (req, res) => {
    try {
      const { language, patientData, clinicalData, labData, imagingData, das28Score } = req.body;
      const langCode: string = ["uz", "ru", "en"].includes(language) ? language : "uz";
      const languageName = LANGUAGE_NAMES[langCode];
      const insufficient = INSUFFICIENT_DATA_PHRASE[langCode];

      const systemPrompt = `You are a clinical decision support assistant for Rheumatoid Arthritis (RA), grounded in the ACR/EULAR 2010 classification criteria and the EULAR 2022 management recommendations.

SAFETY & SCOPE:
- You provide STRUCTURED ANALYSIS for clinicians, NOT a definitive diagnosis.
- Never prescribe specific drugs, dosages, or treatment regimens. Use category names only (e.g., "csDMARDs", "biologic DMARDs", "short-term glucocorticoids").
- Always frame findings as "suggestive of", "consistent with", or "compatible with" — never as confirmed diagnoses.

DATA SUFFICIENCY:
- If a field is missing, "—", or otherwise insufficient to support a judgment, write exactly: "${insufficient}" for that field. DO NOT invent or guess.
- If MOST clinical/lab data is missing, every classification field should be "${insufficient}" and recommendations should focus on what tests/data are needed first.

OUTPUT LANGUAGE:
- All output VALUES must be written in ${languageName}.
- JSON keys must remain in English exactly as specified.
- Respond with valid JSON only — no markdown, no commentary.

JSON SCHEMA (output must match exactly):
{
  "classification": {
    "diagnosisPattern": "e.g., seropositive RA pattern / seronegative pattern / non-RA inflammatory pattern",
    "diseaseStage": "Early (<2 years) / Established / Advanced — or insufficient data",
    "diseaseActivity": "Based on DAS28: remission / low / moderate / high",
    "extraArticular": "Present (with brief details) / Absent / insufficient data",
    "structuralDamage": "Interpretation of Steinbrocker stage",
    "immunology": "RF and Anti-CCP serology interpretation",
    "functionalClass": "Estimated ACR functional class I–IV with brief rationale",
    "complications": "Conditions to monitor (e.g., cardiovascular risk, osteoporosis)"
  },
  "recommendations": {
    "treatmentCategories": ["e.g., csDMARD therapy", "physiotherapy referral"],
    "diagnosticTests": ["e.g., baseline hepatic panel", "hand/feet X-ray follow-up"],
    "monitoringStrategy": "Follow-up cadence and what to track",
    "lifestyle": ["e.g., smoking cessation", "weight management"]
  }
}`;

      const userPrompt = `Reference ranges (for your interpretation):
- ESR: <20 mm/h (women) / <15 mm/h (men)
- CRP: <5 mg/L
- RF: positive if >14 IU/ml
- Anti-CCP: positive if >20 U/ml
- DAS28: <2.6 remission, 2.6–3.2 low, 3.2–5.1 moderate, >5.1 high

PATIENT DATA:
- Age: ${orDash(patientData?.age)}
- Sex: ${orDash(patientData?.sex)}
- BMI: ${orDash(patientData?.bmi)}
- Complaints & history: ${orDash(patientData?.complaints)}

CLINICAL:
- Morning stiffness: ${orDash(clinicalData?.morningStiffness)} min
- TJC28 (tender joints out of 28): ${clinicalData?.tjc28 ?? 0}
- SJC28 (swollen joints out of 28): ${clinicalData?.sjc28 ?? 0}
- Patient global VAS (0–100): ${clinicalData?.vas ?? "—"}

LABS:
- ESR: ${orDash(labData?.esr?.value)} mm/h
- CRP: ${orDash(labData?.crp?.value)} mg/L
- RF: ${orDash(labData?.rf?.value)} IU/ml
- Anti-CCP: ${orDash(labData?.antiCcp?.value)} U/ml

IMAGING:
- Steinbrocker stage: ${orDash(imagingData?.steinbrockerStage)}

DAS28 (computed): ${das28Score?.score ?? insufficient} (${das28Score?.interpretation ?? insufficient})

Produce the JSON now. Output language: ${languageName}.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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
