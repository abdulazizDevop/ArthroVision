import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Image as Download, Printer } from "lucide-react";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";
import { Label } from "./components/ui/Label";
import { Slider } from "./components/ui/Slider";
import { JointMap } from "./components/JointMap";
import { FileUpload } from "./components/FileUpload";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { calculateDAS28 } from "./lib/das28";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function App() {
  const { t, i18n } = useTranslation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // State: Patient Intake
  const [patient, setPatient] = useState({
    name: "",
    age: "",
    sex: "female",
    bmi: "",
    complaints: "",
    history: "",
  });

  // State: Clinical
  const [clinical, setClinical] = useState({
    morningStiffness: "",
    vas: 50,
    physicianVas: 50,
  });
  const [tenderJoints, setTenderJoints] = useState<string[]>([]);
  const [swollenJoints, setSwollenJoints] = useState<string[]>([]);

  // State: Labs
  const [labs, setLabs] = useState({
    esr: { value: "", file: null as any, caption: "" },
    crp: { value: "", file: null as any, caption: "" },
    rf: { value: "", file: null as any, caption: "" },
    antiCcp: { value: "", file: null as any, caption: "" },
  });

  // State: Imaging
  const [imaging, setImaging] = useState({
    steinbrockerStage: "I",
    file: null as any,
    caption: "",
  });

  // State: Results
  const [aiResult, setAiResult] = useState<any>(null);

  const handleToggleJoint = (id: string, type: "tender" | "swollen") => {
    if (type === "tender") {
      setTenderJoints((prev) =>
        prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
      );
    } else {
      setSwollenJoints((prev) =>
        prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
      );
    }
  };

  const das28 = calculateDAS28(
    tenderJoints.length,
    swollenJoints.length,
    clinical.vas,
    parseFloat(labs.esr.value) || undefined,
    parseFloat(labs.crp.value) || undefined
  );

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: i18n.resolvedLanguage || i18n.language || "uz",
          patientData: patient,
          clinicalData: {
            morningStiffness: clinical.morningStiffness,
            tjc28: tenderJoints.length,
            sjc28: swollenJoints.length,
            vas: clinical.vas,
          },
          labData: labs,
          imagingData: imaging,
          das28Score: das28
            ? { ...das28, interpretation: t(`das28.${das28.interpretation}`) }
            : null,
        }),
      });
      const data = await response.json();
      setAiResult(data);
    } catch (error) {
      console.error("Analysis failed", error);
      alert(t("ai.error"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("ArthroVision_Report.pdf");
  };

  const printReport = () => {
    window.print();
  };

  const das28Interpretation = das28
    ? t(`das28.${das28.interpretation}`)
    : t("das28.incomplete");

  return (
    <div className="min-h-screen flex flex-col" ref={reportRef}>
      {/* Header */}
      <header className="h-[60px] px-6 flex items-center justify-between border-b border-(--border) bg-white shrink-0">
        <div className="font-extrabold text-[20px] text-(--accent-plum) flex items-center gap-2">
          ARTHROVISION
          <span className="font-light opacity-50">|</span>
          <span className="text-[12px] text-(--text-muted)">{t("app.version")}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 px-3 py-1 rounded-full text-[13px] font-semibold text-(--accent-blue) hidden sm:block">
            {t("app.patient")}: {patient.name || t("app.anonymous")}
          </div>
          <LanguageSwitcher />
        </div>
        <div className="text-(--high) text-[11px] font-bold uppercase tracking-wider hidden md:block">
          {t("app.disclaimer")}
        </div>
      </header>

      {/* Dashboard */}
      <div className="bento-dashboard flex-1 w-full overflow-y-auto">

        {/* Intake Card */}
        <div className="bento-card bento-intake">
          <div className="bento-card-title">{t("patient.title")}</div>
          <div className="bento-field">
            <div className="bento-label">{t("patient.name")}</div>
            <Input className="h-8 text-sm" value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} placeholder={t("patient.namePlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-2 bento-field">
            <div>
              <div className="bento-label">{t("patient.age")}</div>
              <Input className="h-8 text-sm" type="number" value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value })} />
            </div>
            <div>
              <div className="bento-label">{t("patient.sex")}</div>
              <select className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={patient.sex} onChange={(e) => setPatient({ ...patient, sex: e.target.value })}>
                <option value="female">{t("patient.female")}</option>
                <option value="male">{t("patient.male")}</option>
              </select>
            </div>
          </div>
          <div className="bento-field">
            <div className="bento-label">{t("patient.bmi")}</div>
            <Input className="h-8 text-sm" type="number" value={patient.bmi} onChange={(e) => setPatient({ ...patient, bmi: e.target.value })} />
          </div>
          <div className="bento-field flex-1 flex flex-col">
            <div className="bento-label">{t("patient.complaints")}</div>
            <textarea className="flex-1 min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" value={patient.complaints} onChange={(e) => setPatient({ ...patient, complaints: e.target.value })} placeholder={t("patient.complaintsPlaceholder")} />
          </div>
        </div>

        {/* Joint Map Card */}
        <div className="bento-card bento-joint-map">
          <div className="bento-card-title">
            {t("joints.title")}
            <span>{t("joints.tenderShort")}: {tenderJoints.length} | {t("joints.swollenShort")}: {swollenJoints.length}</span>
          </div>
          <div className="flex-1 relative flex items-center justify-center bg-[#FDFCFE] rounded-xl overflow-hidden min-h-[200px]">
             <JointMap tenderJoints={tenderJoints} swollenJoints={swollenJoints} onToggleJoint={handleToggleJoint} />
          </div>
          <div className="flex gap-3 mt-3 text-[11px] justify-center">
            <span><span className="text-red-500">●</span> {t("joints.tender")}</span>
            <span><span className="text-blue-500">●</span> {t("joints.swollen")}</span>
            <span><span className="text-purple-500">●</span> {t("joints.both")}</span>
            <span><span className="text-gray-300">●</span> {t("joints.unchanged")}</span>
          </div>

          {/* Global Assessment Sliders */}
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="bento-label">{t("joints.patientVas")}</span>
                <span className="text-xs font-bold text-blue-600">{clinical.vas} / 100</span>
              </div>
              <Slider value={[clinical.vas]} onValueChange={(val) => setClinical({ ...clinical, vas: val[0] })} max={100} step={1} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="bento-label">{t("joints.morningStiffness")}</span>
              </div>
              <Input className="h-8 text-sm" type="number" value={clinical.morningStiffness} onChange={(e) => setClinical({ ...clinical, morningStiffness: e.target.value })} placeholder={t("joints.morningStiffnessPlaceholder")} />
            </div>
          </div>
        </div>

        {/* Lab Upload Card */}
        <div className="bento-card bento-lab-upload overflow-y-auto">
          <div className="bento-card-title">{t("labs.title")}</div>
          <div className="space-y-4">
            {/* ESR */}
            <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2">
                 <Label className="w-16 text-xs">{t("labs.esr")}</Label>
                 <Input className="h-7 text-xs w-20" type="number" value={labs.esr.value} onChange={(e) => setLabs({ ...labs, esr: { ...labs.esr, value: e.target.value } })} placeholder={t("labs.valuePlaceholder")} />
               </div>
               <FileUpload label={t("labs.esrUpload")} value={labs.esr.file} onUpload={(f) => setLabs({...labs, esr: {...labs.esr, file: f}})} onRemove={() => setLabs({...labs, esr: {...labs.esr, file: null, caption: ""}})} />
            </div>
            {/* CRP */}
            <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2">
                 <Label className="w-16 text-xs">{t("labs.crp")}</Label>
                 <Input className="h-7 text-xs w-20" type="number" value={labs.crp.value} onChange={(e) => setLabs({ ...labs, crp: { ...labs.crp, value: e.target.value } })} placeholder={t("labs.valuePlaceholder")} />
               </div>
               <FileUpload label={t("labs.crpUpload")} value={labs.crp.file} onUpload={(f) => setLabs({...labs, crp: {...labs.crp, file: f}})} onRemove={() => setLabs({...labs, crp: {...labs.crp, file: null, caption: ""}})} />
            </div>
            {/* RF */}
            <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2">
                 <Label className="w-16 text-xs">{t("labs.rf")}</Label>
                 <Input className="h-7 text-xs w-20" type="number" value={labs.rf.value} onChange={(e) => setLabs({ ...labs, rf: { ...labs.rf, value: e.target.value } })} placeholder={t("labs.valuePlaceholder")} />
               </div>
            </div>
            {/* Anti-CCP */}
            <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2">
                 <Label className="w-16 text-xs">{t("labs.antiCcp")}</Label>
                 <Input className="h-7 text-xs w-20" type="number" value={labs.antiCcp.value} onChange={(e) => setLabs({ ...labs, antiCcp: { ...labs.antiCcp, value: e.target.value } })} placeholder={t("labs.valuePlaceholder")} />
               </div>
            </div>
          </div>
        </div>

        {/* Imaging Card */}
        <div className="bento-card bento-imaging">
          <div className="bento-card-title">{t("imaging.title")}</div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px]">{t("imaging.steinbrocker")}</span>
            <select className="text-[11px] p-1 border rounded" value={imaging.steinbrockerStage} onChange={(e) => setImaging({ ...imaging, steinbrockerStage: e.target.value })}>
              <option value="I">{t("imaging.stage1")}</option>
              <option value="II">{t("imaging.stage2")}</option>
              <option value="III">{t("imaging.stage3")}</option>
              <option value="IV">{t("imaging.stage4")}</option>
            </select>
          </div>
          <FileUpload label={t("imaging.uploadRentgen")} value={imaging.file} onUpload={(f) => setImaging({...imaging, file: f})} onRemove={() => setImaging({...imaging, file: null, caption: ""})} />
          {imaging.file && imaging.file.originalName.match(/\.(jpg|jpeg|png)$/i) && (
            <div className="mt-2 flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[100px]">
              <img src={imaging.file.url} alt="Preview" className="max-h-[150px] object-contain" />
            </div>
          )}
        </div>

        {/* DAS28 Engine Card */}
        <div className="bento-card bento-das28">
          <div className="bento-card-title">{t("das28.title")}</div>
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="bento-das-score">{das28?.score || "0.00"}</div>
            <div className="text-[14px] font-bold text-(--moderate) uppercase">{das28Interpretation}</div>
            <div className="bento-status-bar w-full max-w-[200px]">
              <div className="bento-status-fill" style={{ width: `${Math.min(100, (((das28?.score) || 0) / 10) * 100)}%` }}></div>
            </div>
            <div className="flex justify-between w-full max-w-[200px] text-[10px] text-(--text-muted)">
              <span>{t("das28.remission")}</span>
              <span>{t("das28.highLabel")}</span>
            </div>
          </div>
        </div>

        {/* AI Classification Card */}
        <div className="bento-card bento-ai">
          <div className="bento-card-title">
            {t("ai.title")}
            <Button size="sm" className="h-6 text-[10px] px-2 bg-(--accent-plum) hover:bg-purple-800 text-white" onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? t("ai.loading") : t("ai.generate")}
            </Button>
          </div>
          {aiResult ? (
            <>
              <div className="bento-tag-list">
                <span className="bento-tag danger">{aiResult.classification.diagnosisPattern}</span>
                <span className="bento-tag info">{aiResult.classification.diseaseStage}</span>
                <span className="bento-tag">{aiResult.classification.diseaseActivity}</span>
                <span className="bento-tag">{aiResult.classification.structuralDamage}</span>
              </div>
              <div className="mt-3 text-[12px] text-(--text-muted) leading-relaxed">
                {t("ai.summaryPrefix")} {aiResult.classification.diagnosisPattern}. {aiResult.classification.extraArticular && aiResult.classification.extraArticular !== "Yo'q" && aiResult.classification.extraArticular !== "Нет" && aiResult.classification.extraArticular !== "None" ? `${t("ai.extraArticular")} ${aiResult.classification.extraArticular}.` : t("ai.extraArticularNone")}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 italic">
              {t("ai.noResult")}
            </div>
          )}
        </div>

        {/* Recommendations Card */}
        <div className="bento-card bento-recommendations">
          <div className="bento-card-title">{t("recommendations.title")}</div>
          {aiResult ? (
            <div className="overflow-y-auto">
              {aiResult.recommendations.treatmentCategories.map((r: string, i: number) => (
                <div key={i} className="bento-rec-item">{r}</div>
              ))}
              {aiResult.recommendations.diagnosticTests.map((r: string, i: number) => (
                <div key={i} className="bento-rec-item">{r}</div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 italic">
              {t("recommendations.waiting")}
            </div>
          )}
        </div>

      </div>

      {/* Footer Actions */}
      {aiResult && (
        <div className="p-4 bg-white border-t border-(--border) flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={printReport}>
            <Printer className="w-4 h-4 mr-2" /> {t("actions.print")}
          </Button>
          <Button onClick={downloadPDF} className="bg-(--accent-blue) hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" /> {t("actions.downloadPdf")}
          </Button>
        </div>
      )}
    </div>
  );
}
