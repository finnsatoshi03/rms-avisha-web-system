import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  PartyPopper,
  PlayCircle,
  X,
} from "lucide-react";
import {
  getSoaProgress,
  markSoaStep,
  requestSoaShowMe,
  setSoaCelebrated,
  setSoaDismissed,
  setSoaLang,
  subscribeSoaProgress,
  SOA_STEPS,
  SoaLang,
  SoaStep,
} from "../../lib/soa-progress";
import { cn } from "../../lib/utils";

type StepCopy = {
  title: string;
  hint: string;
};

type StepDefinition = {
  key: SoaStep;
  en: StepCopy;
  tl: StepCopy;
  /** Tour to spotlight when "Show me" is pressed (handled by whichever
   *  billing surface is mounted; falls back to navigation + hint). */
  tourKey?: string;
};

const STEP_DEFINITIONS: StepDefinition[] = [
  {
    key: "visit_billing",
    en: {
      title: "Open the Billing page",
      hint: "This is where every company's tab lives. Click Billing in the sidebar.",
    },
    tl: {
      title: "Buksan ang Billing page",
      hint: "Dito nakalista ang utang (tab) ng bawat company. I-click ang Billing sa sidebar.",
    },
  },
  {
    key: "open_account",
    en: {
      title: "Open a company's account",
      hint: "Click any row in the table to see the company's balance and history.",
    },
    tl: {
      title: "Buksan ang account ng isang company",
      hint: "I-click ang kahit anong row sa table para makita ang balanse at history nila.",
    },
    tourKey: "soa_open_account",
  },
  {
    key: "attach_charge",
    en: {
      title: "Add a job order or rental to the tab",
      hint: "Inside the account, click Attach JO or Attach Rental. Job orders from the company's departments show up here too.",
    },
    tl: {
      title: "Maglagay ng job order o rental sa tab",
      hint: "Sa loob ng account, i-click ang Attach JO o Attach Rental. Kasama rin dito ang mga job order ng mga department ng company.",
    },
    tourKey: "soa_add_charges",
  },
  {
    key: "generate_statement",
    en: {
      title: "Create a Statement (SOA)",
      hint: "Click Statement, pick the dates, then Generate. It's only a draft — nothing is sent yet.",
    },
    tl: {
      title: "Gumawa ng Statement (SOA)",
      hint: "I-click ang Statement, piliin ang petsa, tapos Generate. Draft pa lang ito — wala pang naipapadala.",
    },
    tourKey: "soa_generate_send",
  },
  {
    key: "send_statement",
    en: {
      title: "Send or download the statement",
      hint: "Email it straight to the client, or download the PDF to print.",
    },
    tl: {
      title: "I-send o i-download ang statement",
      hint: "I-email diretso sa client, o i-download ang PDF para i-print.",
    },
    tourKey: "soa_generate_send",
  },
  {
    key: "record_payment",
    en: {
      title: "Record a payment",
      hint: "When the company pays, click Payment and enter the amount. Oldest charges get paid first automatically.",
    },
    tl: {
      title: "Mag-record ng bayad",
      hint: "Kapag nagbayad ang company, i-click ang Payment at ilagay ang halaga. Automatic na unang nababayaran ang pinakalumang utang.",
    },
    tourKey: "soa_record_payment",
  },
];

const COPY = {
  en: {
    title: "Billing tutorial",
    subtitle: "Learn by doing — steps check off as you go.",
    showMe: "Show me",
    done: "done",
    hide: "Hide tutorial",
    congrats: "You've done the whole billing cycle — you're ready!",
    congratsButton: "Finish",
    goHint: "Open the Billing page and click a company's account first.",
  },
  tl: {
    title: "Tutorial sa Billing",
    subtitle: "Matuto habang ginagawa — otomatikong nache-check ang bawat hakbang.",
    showMe: "Ituro sa akin",
    done: "tapos",
    hide: "Itago ang tutorial",
    congrats: "Nagawa mo na ang buong billing cycle — kaya mo na ito!",
    congratsButton: "Tapusin",
    goHint: "Buksan muna ang Billing page at i-click ang account ng isang company.",
  },
};

/**
 * Claude-style onboarding checklist: a small floating card bottom-left that
 * tracks real actions. Hidden once dismissed or after the celebration.
 */
export default function SoaOnboardingChecklist() {
  const [progress, setProgress] = useState(getSoaProgress);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => subscribeSoaProgress(() => setProgress(getSoaProgress())), []);

  // Being on the Billing page IS step 1 — mark it from here too, so the step
  // can never be stuck unchecked while the user is already there (e.g. right
  // after a tutorial restart).
  useEffect(() => {
    if (location.pathname.startsWith("/billing")) {
      markSoaStep("visit_billing");
    }
  }, [location.pathname]);

  const lang: SoaLang = progress.lang;
  const t = COPY[lang];

  const doneCount = useMemo(
    () => SOA_STEPS.filter((s) => progress.steps[s]).length,
    [progress]
  );
  const allDone = doneCount === SOA_STEPS.length;
  const nextStep = STEP_DEFINITIONS.find((s) => !progress.steps[s.key]);

  // Auto-expand the first time everything is complete, for the celebration.
  useEffect(() => {
    if (allDone && !progress.celebrated) setExpanded(true);
  }, [allDone, progress.celebrated]);

  if (progress.dismissed || progress.celebrated) return null;

  // "Show me" must ALWAYS visibly do something: navigate to Billing if
  // needed, then keep re-asking until a mounted billing surface claims the
  // spotlight (the page auto-opens an account for in-account steps).
  const handleShowMe = (step: StepDefinition) => {
    setExpanded(false);

    if (step.key === "visit_billing" || !step.tourKey) {
      navigate("/billing");
      return;
    }

    const attempt = (tries: number) => {
      const claimed = requestSoaShowMe(step.tourKey!);
      if (claimed) return;
      if (tries === 0 && !location.pathname.startsWith("/billing")) {
        navigate("/billing");
      }
      if (tries < 6) {
        setTimeout(() => attempt(tries + 1), 600);
      } else {
        toast(t.goHint, { icon: "👉" });
      }
    };

    // Give the widget a beat to collapse before the spotlight opens.
    setTimeout(() => attempt(0), 250);
  };

  return (
    <div className="w-full px-3 pb-1">
      {expanded ? (
        <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <BookOpen size={15} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{t.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {t.subtitle}
              </p>
            </div>
            <div className="flex shrink-0 items-center rounded-md border p-0.5 text-[10px] font-semibold">
              {(["en", "tl"] as SoaLang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSoaLang(code)}
                  className={cn(
                    "rounded px-1.5 py-0.5 uppercase transition-colors",
                    lang === code
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {code}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Minimize"
            >
              <ChevronUp size={15} />
            </button>
          </div>

          {/* Celebration */}
          {allDone ? (
            <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
              <PartyPopper size={28} className="text-amber-500" />
              <p className="text-sm font-medium leading-relaxed">{t.congrats}</p>
              <button
                type="button"
                onClick={() => setSoaCelebrated()}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {t.congratsButton}
              </button>
            </div>
          ) : (
            <>
              {/* Steps */}
              <div className="px-2 py-2">
                {STEP_DEFINITIONS.map((step, index) => {
                  const isDone = !!progress.steps[step.key];
                  const isNext = nextStep?.key === step.key;
                  const copy = step[lang];
                  return (
                    <div
                      key={step.key}
                      className={cn(
                        "rounded-lg px-2 py-1.5",
                        isNext && "bg-primary/[0.06]"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                            isDone
                              ? "border-green-600 bg-green-600 text-white"
                              : isNext
                                ? "border-primary text-primary"
                                : "border-muted-foreground/40 text-muted-foreground"
                          )}
                        >
                          {isDone ? <Check size={12} strokeWidth={3} /> : index + 1}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-[13px] leading-snug",
                            isDone && "text-muted-foreground line-through decoration-muted-foreground/50",
                            isNext && "font-medium"
                          )}
                        >
                          {copy.title}
                        </span>
                      </div>
                      {/* Only the current step shows its hint — keeps it light */}
                      {isNext && (
                        <div className="mb-1 ml-[1.875rem] mt-1 space-y-1.5">
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            {copy.hint}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleShowMe(step)}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-muted"
                          >
                            <PlayCircle size={12} />
                            {t.showMe}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t px-4 py-2">
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {doneCount}/{SOA_STEPS.length} {t.done}
                </span>
                <button
                  type="button"
                  onClick={() => setSoaDismissed(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <X size={11} />
                  {t.hide}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Collapsed row */
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-2.5 rounded-lg border bg-background px-2.5 py-2 shadow-sm transition-colors hover:bg-sidebar-accent/40"
        >
          <span className="relative flex h-7 w-7 items-center justify-center">
            <svg viewBox="0 0 28 28" className="absolute inset-0 -rotate-90">
              <circle
                cx="14"
                cy="14"
                r="12"
                fill="none"
                strokeWidth="3"
                className="stroke-muted"
              />
              <circle
                cx="14"
                cy="14"
                r="12"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                className="stroke-primary transition-all"
                strokeDasharray={`${(doneCount / SOA_STEPS.length) * 75.4} 75.4`}
              />
            </svg>
            <BookOpen size={12} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-xs font-semibold leading-tight">
              {t.title}
            </span>
            <span className="block text-[10px] tabular-nums text-muted-foreground">
              {doneCount}/{SOA_STEPS.length} {t.done}
            </span>
          </span>
          <ChevronDown size={13} className="shrink-0 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
