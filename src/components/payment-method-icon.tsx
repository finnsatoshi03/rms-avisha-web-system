import { ReactNode, useState } from "react";
import { Banknote, FileCheck2, Landmark, ReceiptText, Split } from "lucide-react";
import { cn } from "../lib/utils";
import { paymentMethodLabel } from "../lib/job-order-payments";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

// E-wallets use the brand's own favicon; the lettermark is the offline fallback.
// ponytail: favicons load from Google's favicon service; vendor them into /public if that ever matters.
const wallets: Record<string, { domain: string; letter: string; className: string }> = {
  gcash: { domain: "gcash.com", letter: "G", className: "bg-[#007dfe] text-white" },
  paymaya: { domain: "maya.ph", letter: "M", className: "bg-[#00b464] text-black" },
  grabpay: { domain: "grab.com", letter: "G", className: "bg-[#00b14f] text-white" },
};

const lucideIcons: Record<string, typeof Banknote> = {
  cash: Banknote,
  check: FileCheck2,
  bank_transfer: Landmark,
  split: Split,
  billing: ReceiptText,
};

export default function PaymentMethodIcon({
  method,
  size = 20,
  className,
  tooltip,
}: {
  method: string;
  size?: number;
  className?: string;
  /** Tooltip text; defaults to the method name. Pass null to disable. */
  tooltip?: ReactNode | null;
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const label = method === "billing" ? "Paid via Billing" : paymentMethodLabel(method);
  const wallet = wallets[method];
  const Icon = lucideIcons[method] || Banknote;
  const showFavicon = wallet && !faviconFailed;

  const icon = (
    <span
      aria-label={label}
      role="img"
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold leading-none",
        showFavicon
          ? "bg-white border"
          : wallet
            ? wallet.className
            : "bg-slate-100 text-slate-600",
        className
      )}
    >
      {showFavicon ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${wallet.domain}&sz=64`}
          alt=""
          className="h-full w-full object-contain"
          onError={() => setFaviconFailed(true)}
        />
      ) : wallet ? (
        <span style={{ fontSize: size * 0.55 }}>{wallet.letter}</span>
      ) : (
        <Icon size={size * 0.6} strokeWidth={2} />
      )}
    </span>
  );

  if (tooltip === null) return icon;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{icon}</TooltipTrigger>
        <TooltipContent className="text-xs">{tooltip ?? label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
