import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Download,
  ImagePlus,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  WifiOff,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PHOTO_SIZE_OPTIONS, PhotoSlot, formatSize, toPx } from "../printing/print-config";
import {
  PROCESSOR_DOWNLOAD_URL,
  PROCESSOR_MODELS,
  ProcessResult,
  ProcessorError,
  ProcessorModelId,
  launchProcessor,
  processPhoto,
  warmModel,
} from "./processor-client";
import { ProcessorAvailability, useProcessor } from "./use-processor";
import {
  PROCESSED_PHOTOS_BUCKET,
  downloadProcessedPhoto,
  listProcessedPhotos,
  uploadProcessedPhoto,
  ProcessedPhotoObject,
} from "../../services/apiProcessedPhotos";
import { supabase } from "../../services/supabase";
import { cn } from "../../lib/utils";

/** Contract presets the service knows natively; other sizes go as explicit px. */
const PRESET_IDS = new Set(["1x1", "2x2", "passport"]);

/** Common Philippine ID background colors + free pick. */
const BG_SWATCHES = [
  { hex: "#FFFFFF", label: "White" },
  { hex: "#2E6DB4", label: "Blue" },
  { hex: "#B7D5F2", label: "Light blue" },
  { hex: "#B32424", label: "Red" },
];

/**
 * When the dialog is opened from a photo-slot upload, the output size and
 * destination slot are fixed to that slot's print cell, and the just-picked
 * file is preloaded.
 */
export interface ProcessorTarget {
  slotIndex: number;
  widthPx: number;
  heightPx: number;
  label: string;
  file?: File;
}

interface PhotoProcessorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Photo slots of the currently selected print package. */
  slots: PhotoSlot[];
  /** Input hook of the printing feature: place `file` into slot `slotIndex`. */
  onUse: (slotIndex: number, file: File) => void;
  target?: ProcessorTarget | null;
}

/**
 * Upload a raw headshot → process it on the local service (background
 * removal, face-centered crop, exact print size) → save to Supabase Storage →
 * hand the PNG to a photo slot of the current print package.
 */
export default function PhotoProcessorDialog({
  open,
  onOpenChange,
  slots,
  onUse,
  target,
}: PhotoProcessorDialogProps) {
  const { health, availability, refresh, markLaunched } = useProcessor(open);

  const [rawFile, setRawFile] = useState<File | null>(null);
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [sizeId, setSizeId] = useState<string>("2x2");
  const [bgColor, setBgColor] = useState<string>("#FFFFFF");
  const [autoCrop, setAutoCrop] = useState(true);
  const [modelId, setModelId] = useState<ProcessorModelId>("u2net");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [slotIndex, setSlotIndex] = useState(0);
  const [saved, setSaved] = useState<ProcessedPhotoObject[]>([]);
  const [savedError, setSavedError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const size = useMemo(
    () => PHOTO_SIZE_OPTIONS.find((s) => s.id === sizeId) ?? PHOTO_SIZE_OPTIONS[1],
    [sizeId]
  );
  const outPx = target
    ? { width: target.widthPx, height: target.heightPx }
    : { width: toPx(size.width), height: toPx(size.height) };

  // Opened from a slot upload: preload the picked file and pin the slot.
  useEffect(() => {
    if (!open || !target) return;
    setSlotIndex(target.slotIndex);
    if (target.file) {
      setRawFile(target.file);
      setRawUrl(URL.createObjectURL(target.file));
      setResult(null);
      setResultUrl(null);
    }
  }, [open, target]);

  // On-demand start: when the dialog finds the service offline, ask Windows to
  // launch the installed exe once per dialog opening. If it was never
  // installed this is a no-op and the banner's download guidance applies.
  const autoLaunchedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      autoLaunchedRef.current = false;
      return;
    }
    if (availability === "offline" && !autoLaunchedRef.current) {
      autoLaunchedRef.current = true;
      launchProcessor();
      markLaunched();
      toast("Starting the photo processor… allow the browser prompt if one appears.", {
        icon: "🚀",
      });
    }
  }, [open, availability, markLaunched]);

  // Object URLs live exactly as long as the file they preview.
  useEffect(() => () => void (rawUrl && URL.revokeObjectURL(rawUrl)), [rawUrl]);
  useEffect(
    () => () => void (resultUrl && URL.revokeObjectURL(resultUrl)),
    [resultUrl]
  );

  useEffect(() => {
    if (slotIndex >= slots.length) setSlotIndex(0);
  }, [slots, slotIndex]);

  const refreshSaved = useCallback(() => {
    listProcessedPhotos()
      .then((items) => {
        setSaved(items);
        setSavedError(null);
      })
      .catch((e: Error) => setSavedError(e.message));
  }, []);

  useEffect(() => {
    if (open) refreshSaved();
  }, [open, refreshSaved]);

  const pickFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setRawFile(file);
    setRawUrl(URL.createObjectURL(file));
    setResult(null);
    setResultUrl(null);
  };

  const handleProcess = async () => {
    if (!rawFile) return;
    setProcessing(true);
    try {
      const res = await processPhoto({
        file: rawFile,
        ...(!target && PRESET_IDS.has(size.id)
          ? { sizePreset: size.id as "1x1" | "2x2" | "passport" }
          : { widthPx: outPx.width, heightPx: outPx.height }),
        bgColor,
        autoCrop,
        model: modelId,
      });
      setResult(res);
      setResultUrl(URL.createObjectURL(res.file));
      if (!res.faceDetected && autoCrop) {
        toast("No face detected — used a centered crop instead.", { icon: "⚠️" });
      }
    } catch (e) {
      toast.error(
        e instanceof ProcessorError ? e.message : "Processing failed."
      );
      void refresh();
    } finally {
      setProcessing(false);
    }
  };

  const finish = (file: File) => {
    onUse(slotIndex, file);
    onOpenChange(false);
    toast.success(`Photo placed into “${slots[slotIndex]?.label ?? "photo"}”.`);
  };

  const handleSaveAndUse = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await uploadProcessedPhoto(result.file, target ? target.label : size.id);
      refreshSaved();
      finish(result.file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saving failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleUseSaved = async (item: ProcessedPhotoObject) => {
    try {
      finish(await downloadProcessedPhoto(item.path));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load photo.");
    }
  };

  const ready = availability === "ready";
  // Older service builds without a models map only ever run the default model.
  const modelState =
    health?.models?.[modelId] ?? (modelId === "u2net" ? "ready" : "unloaded");
  const modelReady = ready && modelState === "ready";

  const handlePickModel = (id: ProcessorModelId) => {
    setModelId(id);
    if (ready && health?.models && health.models[id] !== "ready") {
      void warmModel(id);
      toast("Preparing the model — a one-time download runs in the background.", {
        icon: "⏳",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand-deep" />
            Process ID photo
          </DialogTitle>
          <DialogDescription>
            Removes the background, sets a solid color, and crops the head to
            the exact print size — all on this computer.
          </DialogDescription>
        </DialogHeader>

        <StatusBanner
          availability={availability}
          onRetry={() => void refresh()}
          onLaunch={() => {
            launchProcessor();
            markLaunched();
          }}
        />
        {health && ready && (
          <p className="-mt-2 text-[11px] text-muted-foreground">
            {health.model} ({health.license}) · v{health.version} ·{" "}
            {health.gpu ? "GPU" : "CPU"}
          </p>
        )}

        {/* Upload + options */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files);
              }}
              className={cn(
                "flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed transition-colors",
                rawUrl
                  ? "border-border bg-muted/40"
                  : "border-gray-300 text-muted-foreground hover:border-brand-deep/40 hover:bg-brand-soft/40"
              )}
            >
              {rawUrl ? (
                <img
                  src={rawUrl}
                  alt="Raw headshot"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="flex flex-col items-center gap-1.5 px-4 text-center text-sm">
                  <ImagePlus size={20} className="opacity-70" />
                  Upload raw headshot or drag &amp; drop
                </span>
              )}
            </button>
            {rawFile && (
              <p className="truncate text-xs text-muted-foreground">
                {rawFile.name}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="proc-size">Size</Label>
              {target ? (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  {target.label}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    matches the selected print cell
                  </span>
                </div>
              ) : (
                <Select value={sizeId} onValueChange={setSizeId}>
                  <SelectTrigger id="proc-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHOTO_SIZE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label} — {toPx(opt.width)}×{toPx(opt.height)} px
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-[11px] text-muted-foreground">
                {!target && `${formatSize(size.width, size.height)} at 300 DPI · `}
                {outPx.width}×{outPx.height} px
                {target && " at 300 DPI"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="proc-model">Quality</Label>
              <Select
                value={modelId}
                onValueChange={(v) => handlePickModel(v as ProcessorModelId)}
              >
                <SelectTrigger id="proc-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCESSOR_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modelState === "loading" ? (
                <ModelDownloadProgress
                  progress={health?.model_progress?.[modelId]}
                />
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {modelState === "ready"
                    ? PROCESSOR_MODELS.find((m) => m.id === modelId)?.description
                    : "This model downloads on first use."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Background</Label>
              <div className="flex items-center gap-2">
                {BG_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    title={swatch.label}
                    onClick={() => setBgColor(swatch.hex)}
                    className={cn(
                      "h-7 w-7 rounded-full border transition-shadow",
                      bgColor.toUpperCase() === swatch.hex
                        ? "border-brand-deep ring-2 ring-brand-deep/40"
                        : "border-border hover:ring-2 hover:ring-brand-deep/20"
                    )}
                    style={{ backgroundColor: swatch.hex }}
                    aria-label={`${swatch.label} background`}
                  />
                ))}
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value.toUpperCase())}
                  className="h-7 w-7 cursor-pointer rounded-full border border-border bg-transparent p-0.5"
                  aria-label="Custom background color"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
              <div>
                <Label htmlFor="proc-autocrop" className="text-sm font-medium">
                  Auto-crop to face
                </Label>
                <p className="text-xs text-muted-foreground">
                  Centers the head at the correct ID ratio
                </p>
              </div>
              <Switch
                id="proc-autocrop"
                checked={autoCrop}
                onCheckedChange={setAutoCrop}
              />
            </div>

            <Button
              type="button"
              className="w-full gap-1.5"
              disabled={!modelReady || !rawFile || processing}
              onClick={() => void handleProcess()}
            >
              {processing ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  Process photo
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Result */}
        {result && resultUrl && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start gap-3">
              <img
                src={resultUrl}
                alt="Processed photo"
                className="h-36 w-auto rounded-md border bg-white shadow-sm"
                style={{ aspectRatio: `${result.widthPx} / ${result.heightPx}` }}
              />
              <div className="min-w-0 flex-1 space-y-2 text-sm">
                <p className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 size={15} className="text-green-600" />
                  {result.widthPx}×{result.heightPx} px PNG ready
                </p>
                {!result.faceDetected && autoCrop && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-700">
                    <AlertTriangle size={13} />
                    No face detected — centered crop was used.
                  </p>
                )}
                {!target && slots.length > 1 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Place into</Label>
                    <Select
                      value={String(slotIndex)}
                      onValueChange={(v) => setSlotIndex(Number(v))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {slots.map((slot, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    disabled={saving}
                    onClick={() => void handleSaveAndUse()}
                  >
                    {saving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CloudUpload size={14} />
                    )}
                    Save &amp; use in package
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => finish(result.file)}
                  >
                    Use without saving
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Previously saved photos remain selectable as a package source */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Saved processed photos</h3>
          {savedError ? (
            <p className="text-xs text-muted-foreground">{savedError}</p>
          ) : saved.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing saved yet — processed photos you save appear here for
              reuse.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {saved.map((item) => (
                <SavedThumb
                  key={item.path}
                  item={item}
                  onClick={() => void handleUseSaved(item)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusBanner({
  availability,
  onRetry,
  onLaunch,
}: {
  availability: ProcessorAvailability;
  onRetry: () => void;
  onLaunch: () => void;
}) {
  if (availability === "ready") return null;

  const content: Record<
    Exclude<ProcessorAvailability, "ready">,
    { icon: React.ReactNode; title: string; body: string }
  > = {
    checking: {
      icon: <Loader2 size={15} className="animate-spin" />,
      title: "Looking for the photo processor…",
      body: "Checking the local service on this computer.",
    },
    warming: {
      icon: <Loader2 size={15} className="animate-spin" />,
      title: "Photo processor is starting up",
      body: "The model is still loading (first run downloads it). This can take a minute.",
    },
    starting: {
      icon: <Loader2 size={15} className="animate-spin" />,
      title: "Starting the photo processor…",
      body: "The console window may stay blank for up to a minute while it unpacks — that's normal. This page connects automatically as soon as it's up.",
    },
    blocked: {
      icon: <AlertTriangle size={15} />,
      title: "Local network access is blocked",
      body: "Chrome has denied this site access to local devices. Click the tune icon in the address bar → Site settings → allow “Local network access”, then retry.",
    },
    offline: {
      icon: <WifiOff size={15} />,
      title: "Photo processor is not running",
      body: "We tried to start it automatically. If nothing happens after a few seconds, it isn't installed yet — download it below, run it once (first run downloads the AI model), and it will start on demand from then on. Allow the “access devices on your local network” prompt if Chrome shows one. Requires Chrome or Edge.",
    },
  };
  const c = content[availability];

  return (
    <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0">{c.icon}</span>
          <div>
            <p className="text-sm font-medium">{c.title}</p>
            <p className="text-xs">{c.body}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1 px-2 text-xs text-amber-800 hover:bg-amber-100"
          onClick={onRetry}
        >
          <RefreshCw size={12} />
          Retry
        </Button>
      </div>
      {availability === "offline" && (
        <div className="flex flex-wrap gap-2 pl-6">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 border-amber-300 bg-white px-2.5 text-xs text-amber-800 hover:bg-amber-100"
            onClick={onLaunch}
          >
            <Play size={12} />
            Start processor
          </Button>
          <a
            href={PROCESSOR_DOWNLOAD_URL}
            target="_blank"
            rel="noreferrer"
            className="flex h-7 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            <Download size={12} />
            Download installer
          </a>
        </div>
      )}
    </div>
  );
}

/** Live download progress for a model the service is fetching. The total is
 * an estimate, so the bar caps at 99% until the state flips to ready. */
function ModelDownloadProgress({
  progress,
}: {
  progress?: { done: number; total: number };
}) {
  const mb = (b: number) => Math.round(b / 1_000_000);
  const pct = progress?.total
    ? Math.min(99, Math.round((progress.done / progress.total) * 100))
    : null;

  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-brand-deep transition-all duration-700",
            pct === null && "w-1/4 animate-pulse"
          )}
          style={pct !== null ? { width: `${Math.max(pct, 2)}%` } : undefined}
        />
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 size={11} className="animate-spin" />
        {progress && progress.done > 0
          ? `Downloading model — ${mb(progress.done)} MB of ~${mb(progress.total)} MB (${pct}%)`
          : "Preparing model — this is a one-time setup…"}
      </p>
    </div>
  );
}

function SavedThumb({
  item,
  onClick,
}: {
  item: ProcessedPhotoObject;
  onClick: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    supabase.storage
      .from(PROCESSED_PHOTOS_BUCKET)
      .download(item.path)
      .then(({ data }) => {
        if (!data || cancelled) return;
        revoked = URL.createObjectURL(data);
        setUrl(revoked);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [item.path]);

  return (
    <button
      type="button"
      onClick={onClick}
      title={item.name}
      className="h-20 w-16 shrink-0 overflow-hidden rounded-md border bg-muted/40 transition-colors hover:border-brand-deep/50"
    >
      {url ? (
        <img src={url} alt={item.name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center">
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        </span>
      )}
    </button>
  );
}
