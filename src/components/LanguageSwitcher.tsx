import React from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/src/i18n";

const LABELS: Record<SupportedLanguage, string> = {
  uz: "O'Z",
  ru: "RU",
  en: "EN",
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "uz").slice(0, 2) as SupportedLanguage;

  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-0.5 text-[11px] font-semibold shadow-sm">
      {SUPPORTED_LANGUAGES.map((lng) => {
        const active = current === lng;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => i18n.changeLanguage(lng)}
            className={
              "px-2 py-0.5 rounded-full transition-colors " +
              (active
                ? "bg-purple-700 text-white"
                : "text-gray-500 hover:text-gray-800")
            }
          >
            {LABELS[lng]}
          </button>
        );
      })}
    </div>
  );
}
