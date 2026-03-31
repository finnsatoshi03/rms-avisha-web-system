import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, RotateCcw } from "lucide-react";
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
  const [previewOpen, setPreviewOpen] = useState(false);

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
    setPreviewOpen(false);
  }, [
    open,
    initialValues?.to,
    initialValues?.cc,
    initialValues?.bcc,
    initialValues?.subject,
    initialValues?.message,
  ]);

  const previewRecipients = useMemo(() => {
    return validateComposeInputs(formValues);
  }, [formValues]);

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
      className="space-y-3"
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
      {hasSentBefore && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This document has already been emailed. Sending again will log a new
          entry.
        </div>
      )}

      <div
        className={
          previewOpen
            ? "grid gap-4 md:grid-cols-[minmax(0,1fr)_340px]"
            : undefined
        }
      >
        <div className="space-y-3 min-w-0">
          <div className="space-y-1">
            <label className="text-xs font-semibold" htmlFor="email-to">
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
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold" htmlFor="email-cc">
              CC
            </label>
            <div className="min-h-10 w-full rounded-md border border-input bg-background px-2 py-1">
              <div className="flex flex-wrap gap-1">
                {formValues.cc.map((email) => (
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
                          cc: prev.cc.filter((item) => item !== email),
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
                  id="email-cc"
                  type="text"
                  value={formValues.ccInput}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      ccInput: event.target.value,
                    }))
                  }
                  onInput={() => {
                    if (validationError) {
                      setValidationError(null);
                    }
                  }}
                  onBlur={() => commitEmailTags("cc")}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === "Tab" ||
                      event.key === ","
                    ) {
                      event.preventDefault();
                      commitEmailTags("cc");
                      return;
                    }

                    if (event.key === "Backspace" && !formValues.ccInput) {
                      setFormValues((prev) => ({
                        ...prev,
                        cc: prev.cc.slice(0, -1),
                      }));
                    }
                  }}
                  placeholder={formValues.cc.length === 0 ? "Add CC email" : ""}
                  disabled={isSending}
                  className="min-w-[140px] flex-1 border-0 bg-transparent p-1 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold" htmlFor="email-bcc">
              BCC
            </label>
            <div className="min-h-10 w-full rounded-md border border-input bg-background px-2 py-1">
              <div className="flex flex-wrap gap-1">
                {formValues.bcc.map((email) => (
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
                          bcc: prev.bcc.filter((item) => item !== email),
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
                  id="email-bcc"
                  type="text"
                  value={formValues.bccInput}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      bccInput: event.target.value,
                    }))
                  }
                  onInput={() => {
                    if (validationError) {
                      setValidationError(null);
                    }
                  }}
                  onBlur={() => commitEmailTags("bcc")}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === "Tab" ||
                      event.key === ","
                    ) {
                      event.preventDefault();
                      commitEmailTags("bcc");
                      return;
                    }

                    if (event.key === "Backspace" && !formValues.bccInput) {
                      setFormValues((prev) => ({
                        ...prev,
                        bcc: prev.bcc.slice(0, -1),
                      }));
                    }
                  }}
                  placeholder={formValues.bcc.length === 0 ? "Add BCC email" : ""}
                  disabled={isSending}
                  className="min-w-[140px] flex-1 border-0 bg-transparent p-1 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold" htmlFor="email-subject">
              Subject
            </label>
            <Input
              id="email-subject"
              value={formValues.subject}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, subject: event.target.value }))
              }
              disabled={isSending}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold" htmlFor="email-message">
              Message
            </label>
            <Textarea
              id="email-message"
              value={formValues.message}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, message: event.target.value }))
              }
              rows={8}
              disabled={isSending}
            />
          </div>
        </div>

        {previewOpen && (
          <div className="rounded-md border bg-slate-50 px-3 py-3 text-xs space-y-2 md:max-h-[470px] md:overflow-y-auto">
            <p>
              <strong>To:</strong>{" "}
              {previewRecipients.to.length > 0
                ? previewRecipients.to.join(", ")
                : "-"}
            </p>
            <p>
              <strong>CC:</strong>{" "}
              {previewRecipients.cc.length > 0
                ? previewRecipients.cc.join(", ")
                : "-"}
            </p>
            <p>
              <strong>BCC:</strong>{" "}
              {previewRecipients.bcc.length > 0
                ? previewRecipients.bcc.join(", ")
                : "-"}
            </p>
            <p>
              <strong>Subject:</strong> {formValues.subject || "-"}
            </p>
            <div>
              <strong>Message:</strong>
              <pre className="whitespace-pre-wrap font-sans mt-1 mb-0">
                {formValues.message || "-"}
              </pre>
            </div>
          </div>
        )}
      </div>

      {(validationError || error) && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {validationError || error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
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
          onClick={() => setPreviewOpen((current) => !current)}
          disabled={isSending}
        >
          {previewOpen ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              Hide Preview
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Preview Email
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSending}
        >
          Cancel
        </Button>
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
            "Send"
          )}
        </Button>
      </div>
    </form>
  );
}
