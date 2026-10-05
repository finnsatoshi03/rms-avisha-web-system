import { useEffect, useState } from "react";
import { FileText, Loader2, RotateCcw, Send } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailComposePayload = {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  message: string;
};

type ComposeInputState = {
  to: string;
  cc: string[];
  bcc: string[];
  ccInput: string;
  bccInput: string;
  subject: string;
  message: string;
};

type ComposeInitialValues = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  message: string;
};

interface DocumentEmailComposerProps {
  open: boolean;
  initialValues?: Partial<ComposeInitialValues>;
  isSending?: boolean;
  error?: string | null;
  hasSentBefore?: boolean;
  showBack?: boolean;
  /** File name shown as an attachment chip, e.g. the statement PDF. */
  attachmentName?: string;
  onBack?: () => void;
  onCancel: () => void;
  onSubmit: (payload: EmailComposePayload) => void | Promise<void>;
}

const parseEmailList = (value: string) => {
  const normalized = value
    .split(/[,\n;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

const mergeEmails = (current: string[], incoming: string[]) => {
  return Array.from(new Set([...current, ...incoming]));
};

const validateComposeInputs = (value: ComposeInputState) => {
  const to = parseEmailList(value.to);
  const cc = mergeEmails(value.cc, parseEmailList(value.ccInput));
  const bcc = mergeEmails(value.bcc, parseEmailList(value.bccInput));
  const errors: string[] = [];

  if (to.length === 0) {
    errors.push("At least one valid email is required in To.");
  }

  const invalidEmails = [...to, ...cc, ...bcc].filter(
    (email) => !EMAIL_REGEX.test(email)
  );

  if (invalidEmails.length > 0) {
    errors.push(`Invalid email address: ${invalidEmails[0]}`);
  }

  const seen = new Map<string, string>();
  const groups: Array<{ label: string; values: string[] }> = [
    { label: "To", values: to },
    { label: "CC", values: cc },
    { label: "BCC", values: bcc },
  ];

  for (const group of groups) {
    for (const email of group.values) {
      const previousGroup = seen.get(email);
      if (previousGroup && previousGroup !== group.label) {
        errors.push(
          `Duplicate recipient across groups: ${email} (${previousGroup} and ${group.label}).`
        );
      } else {
        seen.set(email, group.label);
      }
    }
  }

  if (!value.subject.trim()) {
    errors.push("Subject is required.");
  }

  if (!value.message.trim()) {
    errors.push("Message is required.");
  }

  return {
    to,
    cc,
    bcc,
    subject: value.subject.trim(),
    message: value.message.trim(),
    errors,
  };
};

export default function DocumentEmailComposer({
  open,
  initialValues,
  isSending = false,
  error = null,
  hasSentBefore = false,
  showBack = false,
  attachmentName,
  onBack,
  onCancel,
  onSubmit,
}: DocumentEmailComposerProps) {
  const [formValues, setFormValues] = useState<ComposeInputState>({
    to: initialValues?.to ?? "",
    cc: parseEmailList(initialValues?.cc ?? ""),
    bcc: parseEmailList(initialValues?.bcc ?? ""),
    ccInput: "",
    bccInput: "",
    subject: initialValues?.subject ?? "",
    message: initialValues?.message ?? "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showCopies, setShowCopies] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormValues({
      to: initialValues?.to ?? "",
      cc: parseEmailList(initialValues?.cc ?? ""),
      bcc: parseEmailList(initialValues?.bcc ?? ""),
      ccInput: "",
      bccInput: "",
      subject: initialValues?.subject ?? "",
      message: initialValues?.message ?? "",
    });
    setValidationError(null);
    setShowCopies(Boolean(initialValues?.cc || initialValues?.bcc));
  }, [
    open,
    initialValues?.to,
    initialValues?.cc,
    initialValues?.bcc,
    initialValues?.subject,
    initialValues?.message,
  ]);

  const commitEmailTags = (group: "cc" | "bcc") => {
    const inputValue = group === "cc" ? formValues.ccInput : formValues.bccInput;
    const parsed = parseEmailList(inputValue);
    if (parsed.length === 0) return;

    const invalidEmail = parsed.find((email) => !EMAIL_REGEX.test(email));
    if (invalidEmail) {
      setValidationError(`Invalid email address: ${invalidEmail}`);
      return;
    }

    setFormValues((prev) => ({
      ...prev,
      [group]: mergeEmails(prev[group], parsed),
      ...(group === "cc" ? { ccInput: "" } : { bccInput: "" }),
    }));
    setValidationError(null);
  };

  const canSubmit = !isSending;

  return (
    <form
      className="min-w-0 overflow-hidden rounded-xl bg-background shadow-xl"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = validateComposeInputs(formValues);
        if (parsed.errors.length > 0) {
          setValidationError(parsed.errors[0]);
          return;
        }
        setValidationError(null);
        onSubmit({
          to: parsed.to,
          cc: parsed.cc,
          bcc: parsed.bcc,
          subject: parsed.subject,
          message: parsed.message,
        });
      }}
    >
      <div>
        <div className="bg-foreground px-4 py-2.5 text-sm font-semibold text-background">
          New email
        </div>
        {hasSentBefore && (
          <div className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-800">
            This was already emailed. Sending again will log a new entry.
          </div>
        )}

        <div className="flex items-center gap-3 border-b px-4 py-2">
          <label className="w-14 shrink-0 text-sm text-muted-foreground" htmlFor="email-to">
            To
          </label>
          <Input
            id="email-to"
            type="text"
            value={formValues.to}
            onChange={(event) =>
              setFormValues((prev) => ({ ...prev, to: event.target.value }))
            }
            placeholder="client@email.com"
            disabled={isSending}
            className="h-8 rounded-full border bg-muted/50 px-3 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-offset-0"
          />
          {!showCopies && (
            <button
              type="button"
              onClick={() => setShowCopies(true)}
              disabled={isSending}
              className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cc/Bcc
            </button>
          )}
        </div>

        {showCopies &&
          (["cc", "bcc"] as const).map((group) => {
            const inputKey = group === "cc" ? "ccInput" : "bccInput";
            const label = group.toUpperCase();
            return (
              <div key={group} className="flex items-center gap-3 border-b px-4 py-1.5">
                <label
                  className="w-14 shrink-0 text-sm text-muted-foreground"
                  htmlFor={`email-${group}`}
                >
                  {label}
                </label>
                <div className="flex min-h-8 flex-1 flex-wrap items-center gap-1">
                  {formValues[group].map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() =>
                          setFormValues((prev) => ({
                            ...prev,
                            [group]: prev[group].filter((item) => item !== email),
                          }))
                        }
                        disabled={isSending}
                        className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
                        aria-label={`Remove ${email}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                  <input
                    id={`email-${group}`}
                    type="text"
                    value={formValues[inputKey]}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [inputKey]: event.target.value,
                      }))
                    }
                    onInput={() => {
                      if (validationError) {
                        setValidationError(null);
                      }
                    }}
                    onBlur={() => commitEmailTags(group)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === "Tab" ||
                        event.key === ","
                      ) {
                        event.preventDefault();
                        commitEmailTags(group);
                        return;
                      }

                      if (event.key === "Backspace" && !formValues[inputKey]) {
                        setFormValues((prev) => ({
                          ...prev,
                          [group]: prev[group].slice(0, -1),
                        }));
                      }
                    }}
                    placeholder={formValues[group].length === 0 ? `Add ${label} email` : ""}
                    disabled={isSending}
                    className="min-w-[140px] flex-1 border-0 bg-transparent p-1 text-sm outline-none"
                  />
                </div>
              </div>
            );
          })}

        <div className="flex items-center gap-3 border-b px-4 py-2">
          <label className="w-14 shrink-0 text-sm text-muted-foreground" htmlFor="email-subject">
            Subject
          </label>
          <Input
            id="email-subject"
            value={formValues.subject}
            onChange={(event) =>
              setFormValues((prev) => ({ ...prev, subject: event.target.value }))
            }
            disabled={isSending}
            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <Textarea
          id="email-message"
          aria-label="Message"
          value={formValues.message}
          onChange={(event) =>
            setFormValues((prev) => ({ ...prev, message: event.target.value }))
          }
          rows={8}
          disabled={isSending}
          className="rounded-none border-0 px-4 py-3 focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        {attachmentName && (
          <div className="px-4 pb-3">
            <span className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold">
              <FileText className="h-4 w-4 text-brand" />
              {attachmentName}
            </span>
          </div>
        )}
      </div>

      {(validationError || error) && (
        <div className="border-t bg-red-50 px-4 py-2 text-xs text-red-700">
          {validationError || error}
        </div>
      )}

      {/* Email-client style footer: Cancel on the left, Send on the right. */}
      <div className="flex items-center gap-2 border-t px-4 py-3">
        {showBack && onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isSending}
          >
            Back
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSending}
        >
          Cancel
        </Button>
        <div className="flex-1" />
        <Button type="submit" disabled={!canSubmit}>
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : error ? (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
