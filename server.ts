import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  app.post("/api/analyze", async (req, res) => {
    try {
      const { patientData, clinicalData, labData, imagingData, das28Score } = req.body;

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
        
        Calculated DAS28: ${das28Score.score} (${das28Score.interpretation})
        
        Provide the output as a JSON object with the following structure. PLEASE PROVIDE ALL VALUES IN UZBEK LANGUAGE:
        {
          "classification": {
            "diagnosisPattern": "e.g., Seropozitiv RA ga mos keladi",
            "diseaseStage": "e.g., Erta / Rivojlangan",
            "diseaseActivity": "e.g., DAS28 ga ko'ra yuqori faollik",
            "extraArticular": "Ma'lumotlarga ko'ra mavjud / Yo'q / Noma'lum",
            "structuralDamage": "Shteynbroker bosqichi...",
            "immunology": "ACPA musbat/manfiy",
            "functionalClass": "I-IV sinf bahosi",
            "complications": "Kuzatilishi kerak bo'lgan ehtimoliy asoratlar"
          },
          "recommendations": {
            "treatmentCategories": ["Kategoriya 1", "Kategoriya 2"],
            "diagnosticTests": ["Test 1", "Test 2"],
            "monitoringStrategy": "Monitoring tavsifi",
            "lifestyle": ["Tavsiya 1", "Tavsiya 2"]
          }
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const resultText = response.text;
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
