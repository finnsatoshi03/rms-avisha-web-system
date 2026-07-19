import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FileText,
  Hand,
  Lock,
  Move,
  PencilLine,
  Printer as PrinterIcon,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import HeaderText from "../components/ui/headerText";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import ErrorBoundary from "../components/error-boundery";
import {
  CUSTOM_PACKAGE_ID,
  CustomRow,
  DEFAULT_CUSTOM_ROWS,
  DEFAULT_SHEET,
  DPI,
  MM_PER_INCH,
  PRINT_PACKAGES,
  PhysicalDim,
  SHEETS,
  SheetId,
  buildCustomPackage,
  formatSize,
  packageHasCaption,
  toPx,
} from "../components/printing/print-config";
import {
  applyLayoutOffset,
  clampLayoutOffset,
  computeSheetLayout,
  layoutSlack,
} from "../components/printing/layout-engine";
import { usePhotoSlots } from "../components/printing/use-photo-slots";
import { usePrintingAccess } from "../components/printing/use-printing-access";
import {
  effectivePrice,
  usePrintPrices,
} from "../components/printing/use-print-prices";
import PriceEditorDialog from "../components/printing/price-editor-dialog";
import { useUser } from "../components/auth/useUser";
import SheetCanvas, {
  CaptionText,
  InteractionMode,
  SheetCanvasHandle,
} from "../components/printing/sheet-canvas";
import PackageThumbnail from "../components/printing/package-thumbnail";
import PhotoSlotControls from "../components/printing/photo-slot-controls";
import PhotoProcessorDialog, {
  ProcessorTarget,
} from "../components/processing/photo-processor-dialog";
import ProcessOfferDialog from "../components/processing/process-offer-dialog";
import CustomPackageBuilder from "../components/printing/custom-package-builder";
import RecentJobs from "../components/printing/recent-jobs";
import {
  PrintJobRecord,
  deleteJob,
  listJobs,
  makeThumbnail,
  saveJob,
} from "../components/printing/print-jobs-store";
import {
  exportSheetPdf,
  exportSheetPng,
  printSheet,
} from "../components/printing/print-export";
import { RestorableSlot } from "../components/printing/use-photo-slots";
import { formatNumberWithCommas } from "../lib/helpers";
import { cn } from "../lib/utils";

export default function Printing() {
  const [packageId, setPackageId] = useState(PRINT_PACKAGES[0].id);
  const [customRows, setCustomRows] =
    useState<CustomRow[]>(DEFAULT_CUSTOM_ROWS);
  const [sheetId, setSheetId] = useState<SheetId>(DEFAULT_SHEET);
  const [text, setText] = useState<CaptionText>({ name: "", subtitle: "" });
  const [mode, setMode] = useState<InteractionMode>("photo");
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [whiteBorder, setWhiteBorder] = useState(false);
  const [jobs, setJobs] = useState<PrintJobRecord[]>([]);
  const {
    slots,
    setPhoto,
    clearPhoto,
    setTransform,
    resetTransform,
    rotatePhoto,
    restoreSlots,
  } = usePhotoSlots();
  const { unlocked, isLoading: accessLoading } = usePrintingAccess();
  const locked = !unlocked;
  const { overrides } = usePrintPrices();
  const { isAdmin, isDev } = useUser();
  const canEditPrices = isAdmin || isDev;
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [processorOpen, setProcessorOpen] = useState(false);
  const [processorTarget, setProcessorTarget] =
    useState<ProcessorTarget | null>(null);
  const [processOffer, setProcessOffer] = useState<ProcessorTarget | null>(
    null,
  );
  const canvasRef = useRef<SheetCanvasHandle>(null);

  const pkg = useMemo(() => {
    if (packageId === CUSTOM_PACKAGE_ID) return buildCustomPackage(customRows);
    return PRINT_PACKAGES.find((p) => p.id === packageId) ?? PRINT_PACKAGES[0];
  }, [packageId, customRows]);

  const baseLayout = useMemo(
    () => computeSheetLayout(pkg, sheetId),
    [pkg, sheetId],
  );
  const layout = useMemo(
    () => applyLayoutOffset(baseLayout, offset),
    [baseLayout, offset],
  );
  const slack = layoutSlack(baseLayout);
  const canMoveLayout = slack.x > 0 || slack.y > 0;
  const hasCaption = packageHasCaption(pkg);

  // A different package or paper gets a fresh, centered placement.
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
    setMode("photo");
  }, [packageId, sheetId]);

  // Custom-builder edits can shrink the slack; keep the offset legal.
  useEffect(() => {
    setOffset((prev) => clampLayoutOffset(baseLayout, prev));
  }, [baseLayout]);

  const refreshJobs = useCallback(async () => {
    try {
      setJobs(await listJobs());
    } catch {
      // IndexedDB unavailable (private mode etc.) — recent jobs just hide.
    }
  }, []);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  const handleLayoutMove = useCallback(
    (dx: number, dy: number) => {
      setOffset((prev) =>
        clampLayoutOffset(baseLayout, { x: prev.x + dx, y: prev.y + dy }),
      );
    },
    [baseLayout],
  );

  // ID-sized cells (1×1, 2×2, passport…) get an offer to run the upload
  // through the local photo processor; larger formats upload as-is silently.
  const inchesOf = (d: PhysicalDim) =>
    d.unit === "in" ? d.value : d.value / MM_PER_INCH;

  const slotProcessorTarget = useCallback(
    (slotIndex: number, file: File): ProcessorTarget | null => {
      const group =
        pkg.groups.find((g) => (g.slot ?? 0) === slotIndex) ?? pkg.groups[0];
      if (!group) return null;
      if (inchesOf(group.width) > 2.5 || inchesOf(group.height) > 2.5)
        return null;
      // Name-plate cells reserve a caption strip; process to the photo area.
      const heightPx =
        toPx(group.height) -
        (group.captionHeight ? toPx(group.captionHeight) : 0);
      return {
        slotIndex,
        widthPx: toPx(group.width),
        heightPx,
        label: formatSize(group.width, group.height),
        file,
      };
    },
    [pkg],
  );

  const handlePickPhoto = useCallback(
    (slotIndex: number, file: File) => {
      setPhoto(slotIndex, file); // usable as-is even if the offer is declined
      setProcessOffer(slotProcessorTarget(slotIndex, file));
    },
    [setPhoto, slotProcessorTarget],
  );

  const hasPhoto = Boolean(slots[0]?.image);
  const isReady =
    hasPhoto && layout.fits && (!hasCaption || text.name.trim().length > 0);

  const persistJob = useCallback(
    async (printCanvas: HTMLCanvasElement) => {
      try {
        const storedSlots: RestorableSlot[] = [];
        for (let i = 0; i < pkg.slots.length; i++) {
          const s = slots[i];
          if (!s) continue;
          storedSlots.push({
            index: i,
            blob: s.file,
            fileName: s.fileName,
            zoom: s.zoom,
            offsetX: s.offsetX,
            offsetY: s.offsetY,
            rotation: s.rotation,
          });
        }
        await saveJob({
          id: String(Date.now()),
          createdAt: Date.now(),
          packageId,
          packageName:
            pkg.name === "Custom"
              ? `Custom (${pkg.slots.length} size${pkg.slots.length > 1 ? "s" : ""})`
              : pkg.name,
          sheetId,
          customRows: packageId === CUSTOM_PACKAGE_ID ? customRows : undefined,
          text,
          slots: storedSlots,
          thumbnail: makeThumbnail(printCanvas),
        });
        void refreshJobs();
      } catch {
        // Saving history must never block printing.
      }
    },
    [pkg, slots, packageId, customRows, sheetId, text, refreshJobs],
  );

  const handlePrint = () => {
    const canvas = canvasRef.current?.getPrintCanvas();
    if (!canvas) return;
    printSheet(canvas, {
      widthIn: layout.sheetWidthIn,
      heightIn: layout.sheetHeightIn,
    });
    void persistJob(canvas);
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current?.getPrintCanvas();
    if (!canvas) return;
    void exportSheetPng(canvas, `print-${pkg.id}-${sheetId}.png`);
    void persistJob(canvas);
  };

  const handleExportPdf = async () => {
    const canvas = canvasRef.current?.getPrintCanvas();
    if (!canvas) return;
    try {
      await exportSheetPdf(
        canvas,
        { widthIn: layout.sheetWidthIn, heightIn: layout.sheetHeightIn },
        `print-${pkg.id}-${sheetId}.pdf`,
      );
      void persistJob(canvas);
    } catch {
      toast.error("PDF export failed. Try the PNG export instead.");
    }
  };

  const handleRestore = (job: PrintJobRecord) => {
    if (
      job.packageId !== CUSTOM_PACKAGE_ID &&
      !PRINT_PACKAGES.some((p) => p.id === job.packageId)
    ) {
      toast.error("This saved job uses a package that no longer exists.");
      return;
    }
    if (job.packageId === CUSTOM_PACKAGE_ID && job.customRows) {
      setCustomRows(job.customRows);
    }
    setPackageId(job.packageId);
    setSheetId(job.sheetId);
    setText(job.text);
    restoreSlots(job.slots);
    toast.success("Print job restored.");
  };

  const handleDeleteJob = (id: string) => {
    void deleteJob(id).then(refreshJobs);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-wrap items-center gap-3">
        <HeaderText>Photo Printing</HeaderText>
        {!accessLoading && locked && (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            <Lock size={12} />
            Demo mode — printed sheets carry a watermark until activated
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Arrange finished photos into standard print packages. Photos are placed
        as-is — no editing or retouching.
      </p>

      <div className="mt-4 grid flex-1 min-h-0 gap-6 lg:grid-cols-[minmax(320px,400px)_1fr]">
        {/* Left: package, paper, inputs */}
        <div className="min-h-0 space-y-5 overflow-y-auto pb-6 pr-1">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Package</h2>
              {canEditPrices && (
                <button
                  type="button"
                  onClick={() => setPriceDialogOpen(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <PencilLine size={12} />
                  Edit prices
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {PRINT_PACKAGES.map((p) => {
                const active = p.id === packageId;
                const price = effectivePrice(p, overrides);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPackageId(p.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center transition-colors",
                      active
                        ? "border-brand-deep/50 bg-brand-soft/60 shadow-sm"
                        : "border-border bg-card hover:border-gray-300 hover:bg-muted/40",
                    )}
                  >
                    {price != null && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                        ₱{formatNumberWithCommas(price)}
                      </span>
                    )}
                    <PackageThumbnail
                      pkg={p}
                      sheetId="4r"
                      active={active}
                      className={cn(
                        "w-auto",
                        p.orientation === "landscape" ? "h-9" : "h-14",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-medium leading-tight",
                        active && "text-brand-deep",
                      )}
                    >
                      {p.name}
                    </span>
                    <span className="text-[10px] leading-tight text-muted-foreground">
                      {p.summary}
                    </span>
                  </button>
                );
              })}

              {/* Custom builder card — thumbnail reflects the current rows */}
              <button
                type="button"
                onClick={() => setPackageId(CUSTOM_PACKAGE_ID)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border border-dashed p-2.5 text-center transition-colors",
                  packageId === CUSTOM_PACKAGE_ID
                    ? "border-brand-deep/50 bg-brand-soft/60 shadow-sm"
                    : "border-gray-300 bg-card hover:border-gray-400 hover:bg-muted/40",
                )}
              >
                <PackageThumbnail
                  pkg={buildCustomPackage(customRows)}
                  sheetId="4r"
                  active={packageId === CUSTOM_PACKAGE_ID}
                  className="h-14 w-auto"
                />
                <span
                  className={cn(
                    "text-xs font-medium leading-tight",
                    packageId === CUSTOM_PACKAGE_ID && "text-brand-deep",
                  )}
                >
                  Custom
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground">
                  Mix sizes & quantities
                </span>
              </button>
            </div>
          </section>

          {packageId === CUSTOM_PACKAGE_ID && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Custom sheet</h2>
              <CustomPackageBuilder
                rows={customRows}
                onChange={setCustomRows}
                fits={baseLayout.fits}
              />
            </section>
          )}

          <section className="space-y-1.5">
            <Label htmlFor="sheet-size" className="text-sm font-semibold">
              Paper
            </Label>
            <Select
              value={sheetId}
              onValueChange={(v) => setSheetId(v as SheetId)}
            >
              <SelectTrigger id="sheet-size" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SHEETS).map((sheet) => (
                  <SelectItem key={sheet.id} value={sheet.id}>
                    {sheet.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {pkg.slots.length > 1 ? "Photos" : "Photo"}
              </h2>
              <button
                type="button"
                onClick={() => setProcessorOpen(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Sparkles size={12} />
                Process ID photo
              </button>
            </div>
            {pkg.slots.map((slot, i) => (
              <PhotoSlotControls
                key={`${pkg.id}-${i}`}
                slotIndex={i}
                slot={slot}
                state={slots[i]}
                onPick={handlePickPhoto}
                onClear={clearPhoto}
                onTransform={setTransform}
                onRotate={rotatePhoto}
                onReset={resetTransform}
              />
            ))}
            <p className="text-xs text-muted-foreground">
              Tip: drag a photo on the preview to reframe it; scroll to zoom.
            </p>
          </section>

          {hasCaption && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Name below each photo</h2>
              <div className="space-y-1.5">
                <Label htmlFor="plate-name">Name</Label>
                <Input
                  id="plate-name"
                  value={text.name}
                  placeholder="e.g. JUAN DELA CRUZ"
                  onChange={(e) =>
                    setText((t) => ({ ...t, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plate-subtitle">
                  Subtitle{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="plate-subtitle"
                  value={text.subtitle}
                  placeholder="e.g. Branch Manager"
                  onChange={(e) =>
                    setText((t) => ({ ...t, subtitle: e.target.value }))
                  }
                />
              </div>
            </section>
          )}

          <section className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
            <div>
              <Label htmlFor="white-border" className="text-sm font-medium">
                White border
              </Label>
              <p className="text-xs text-muted-foreground">
                Thin white frame inside each photo for easier cutting
              </p>
            </div>
            <Switch
              id="white-border"
              checked={whiteBorder}
              onCheckedChange={setWhiteBorder}
            />
          </section>

          <Separator />

          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={!isReady}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm text-white",
                  "bg-primaryRed hover:bg-hoveredRed disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <PrinterIcon size={16} />
                Print sheet
              </button>
              <Button
                type="button"
                variant="outline"
                className="h-fit gap-1.5 rounded-lg px-3 py-1.5 text-sm"
                disabled={!isReady}
                onClick={handleExportPng}
              >
                <Download size={16} />
                PNG
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-fit gap-1.5 rounded-lg px-3 py-1.5 text-sm"
                disabled={!isReady}
                onClick={() => void handleExportPdf()}
              >
                <FileText size={16} />
                PDF
              </Button>
              {effectivePrice(pkg, overrides) != null && (
                <span className="ml-auto text-sm font-semibold">
                  ₱{formatNumberWithCommas(effectivePrice(pkg, overrides)!)}
                </span>
              )}
            </div>
            {!isReady && (
              <p className="text-xs text-muted-foreground">
                {!hasPhoto
                  ? "Upload a photo to enable printing."
                  : !layout.fits
                    ? "The current selection does not fit the paper."
                    : "Enter a name to enable printing."}
              </p>
            )}
          </section>

          <RecentJobs
            jobs={jobs}
            onRestore={handleRestore}
            onDelete={handleDeleteJob}
          />

          {canEditPrices && (
            <PriceEditorDialog
              open={priceDialogOpen}
              onOpenChange={setPriceDialogOpen}
              overrides={overrides}
            />
          )}

          <ProcessOfferDialog
            offer={processOffer}
            onDismiss={() => setProcessOffer(null)}
            onAccept={() => {
              setProcessorTarget(processOffer);
              setProcessOffer(null);
              setProcessorOpen(true);
            }}
          />

          <PhotoProcessorDialog
            open={processorOpen}
            onOpenChange={(o) => {
              setProcessorOpen(o);
              if (!o) setProcessorTarget(null);
            }}
            slots={pkg.slots}
            onUse={setPhoto}
            target={processorTarget}
          />
        </div>

        {/* Right: live preview of the exact print canvas */}
        <div className="min-h-0 flex flex-col pb-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs">
              <ModeButton
                active={mode === "photo"}
                onClick={() => setMode("photo")}
                icon={<Hand size={13} />}
                label="Adjust photos"
              />
              <ModeButton
                active={mode === "layout"}
                onClick={() => setMode("layout")}
                icon={<Move size={13} />}
                label="Move on paper"
                disabled={!canMoveLayout}
                title={
                  canMoveLayout
                    ? undefined
                    : "This package fills the sheet — nowhere to move it"
                }
              />
            </div>
            <div className="flex items-center gap-2">
              {(offset.x !== 0 || offset.y !== 0) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                  onClick={() => setOffset({ x: 0, y: 0 })}
                >
                  <RotateCcw size={12} />
                  Re-center layout
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                {mode === "photo"
                  ? "Drag a photo to reframe · scroll to zoom"
                  : "Drag to place the layout on free paper"}
              </span>
            </div>
          </div>

          <ErrorBoundary>
            <div className="flex min-h-[420px] flex-1 items-center justify-center rounded-xl border bg-muted/40 p-6">
              <SheetCanvas
                ref={canvasRef}
                pkg={pkg}
                sheetId={sheetId}
                layout={layout}
                slots={slots}
                text={text}
                mode={mode}
                whiteBorder={whiteBorder}
                locked={locked}
                onTransform={setTransform}
                onLayoutMove={handleLayoutMove}
                className="h-auto max-h-full w-auto max-w-full border bg-white shadow-card"
              />
            </div>
          </ErrorBoundary>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {SHEETS[sheetId].label} · {layout.sheetWidth}×{layout.sheetHeight}{" "}
            px @ {DPI} DPI — the preview is the exact sheet that prints.
            {!layout.fits &&
              " ⚠ This package does not fit the selected paper size."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  disabled,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors",
        active
          ? "bg-white font-medium text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-50 hover:text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
