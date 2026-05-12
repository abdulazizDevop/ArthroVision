import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { UploadCloud, X, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface FileUploadProps {
  label: string;
  accept?: string;
  onUpload: (fileData: { url: string; filename: string; originalName: string }) => void;
  onRemove: () => void;
  value?: { url: string; filename: string; originalName: string } | null;
  caption?: string;
  onCaptionChange?: (caption: string) => void;
}

export function FileUpload({
  label,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  onUpload,
  onRemove,
  value,
  caption,
  onCaptionChange,
}: FileUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        onUpload(data);
      } else {
        console.error("Upload failed");
      }
    } catch (error) {
      console.error("Upload error", error);
    } finally {
      setIsUploading(false);
    }
  };

  const isImage = value?.originalName.match(/\.(jpg|jpeg|png|gif)$/i);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none">{label}</label>
      {!value ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors",
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:bg-gray-50",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            {isUploading ? t("upload.uploading") : t("upload.dragOrClick")}
          </p>
          <p className="text-xs text-gray-400 mt-1">{t("upload.supported")} {accept}</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3 overflow-hidden">
              {isImage ? (
                <ImageIcon className="h-8 w-8 text-blue-500 shrink-0" />
              ) : (
                <FileText className="h-8 w-8 text-blue-500 shrink-0" />
              )}
              <div className="truncate">
                <p className="text-sm font-medium truncate">{value.originalName}</p>
                <a
                  href={value.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  {t("upload.viewFile")}
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-gray-500 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {onCaptionChange && (
            <input
              type="text"
              placeholder={t("upload.captionPlaceholder")}
              value={caption || ""}
              onChange={(e) => onCaptionChange(e.target.value)}
              className="w-full text-sm border-b border-gray-300 bg-transparent px-1 py-1 focus:outline-none focus:border-blue-500"
            />
          )}
        </div>
      )}
    </div>
  );
}
