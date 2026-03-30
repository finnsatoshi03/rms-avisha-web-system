import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Image, Upload, X } from "lucide-react";
import { Button } from "../ui/button";
import { validateReceiptFile } from "../../services/apiBilling";

interface ReceiptAttachmentFieldProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  inputId?: string;
}

export default function ReceiptAttachmentField({
  file,
  onFileChange,
  disabled = false,
  inputId = "receipt-upload",
}: ReceiptAttachmentFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSelectedFile = (selectedFile: File | null) => {
    if (!selectedFile) {
      setError(null);
      onFileChange(null);
      return;
    }

    const validationError = validateReceiptFile(selectedFile);
    if (validationError) {
      setError(validationError);
      onFileChange(null);
      return;
    }

    setError(null);
    onFileChange(selectedFile);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs md:text-sm font-medium">Attach Receipt (Optional)</p>
        {file && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={disabled}
            onClick={() => {
              onFileChange(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
          >
            <X size={12} className="mr-1" />
            Remove
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-dashed p-3 bg-slate-50/60">
        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,application/pdf"
          disabled={disabled}
          onChange={(event) =>
            handleSelectedFile(event.target.files?.[0] || null)
          }
        />
        {!file ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              JPG, PNG, PDF up to 10MB
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={12} className="mr-1" />
              Upload File
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              {file.type === "application/pdf" ? (
                <FileText size={14} className="text-red-600" />
              ) : (
                <Image size={14} className="text-blue-600" />
              )}
              <span className="truncate">{file.name}</span>
            </div>
            {previewUrl &&
              (file.type === "application/pdf" ? (
                <object
                  data={previewUrl}
                  type="application/pdf"
                  className="w-full h-40 rounded border bg-white"
                >
                  <p className="text-xs text-muted-foreground p-2">
                    PDF preview is unavailable in this browser.
                  </p>
                </object>
              ) : (
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="w-full h-40 object-contain rounded border bg-white"
                />
              ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
