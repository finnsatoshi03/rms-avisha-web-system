/**
 * Shared client-lookup filter used by every record search (job orders,
 * quotations, rentals, archive).
 *
 * Mobile numbers are stored formatted as "+63 917 123 4567" by PhoneInput, so a
 * plain `contact_number.ilike.%term%` only matched when the user happened to
 * type the digits with exactly the right spacing. We additionally match against
 * `clients.contact_digits` — a generated bare-digits column added in
 * supabase/migrations/20260819120000_clients_contact_digits.sql.
 */

/** PostgREST parses `or=(...)` on commas and parens, so a term containing them
 *  would corrupt the whole filter. Strip the delimiters rather than fail. */
function sanitizeFilterTerm(term: string): string {
  return term.replace(/[,()]/g, " ").trim();
}

/**
 * Reduce a phone-ish search term to the digit run we can substring-match
 * against `contact_digits` (which holds e.g. "639171234567").
 *
 * "+63 917 123 4567" -> "9171234567"
 * "09171234567"      -> "9171234567"
 * "639171234567"     -> "9171234567"
 * "1234567"          -> "1234567"
 *
 * Returns null when the term has too few digits to be a meaningful phone
 * fragment, so we don't drown the results in noise from a stray digit.
 */
export function normalizePhoneQuery(term: string): string | null {
  const digits = term.replace(/\D/g, "");
  if (digits.length < 3) return null;

  // Country code, only when the term is long enough to actually carry one.
  if (digits.startsWith("63") && digits.length >= 11) return digits.slice(2);

  // National trunk prefix: "0917..." is the same subscriber as "917...".
  if (digits.startsWith("0")) {
    const trimmed = digits.replace(/^0+/, "");
    return trimmed.length >= 3 ? trimmed : null;
  }

  return digits;
}

/**
 * Build the `.or(...)` filter for looking up clients by name, email, or mobile
 * number. Pass the raw (untrimmed is fine) search term.
 */
export function buildClientSearchFilter(term: string): string {
  const safe = sanitizeFilterTerm(term);

  const conditions = [
    `name.ilike.%${safe}%`,
    `email.ilike.%${safe}%`,
    `contact_number.ilike.%${safe}%`,
  ];

  const phone = normalizePhoneQuery(term);
  if (phone) conditions.push(`contact_digits.ilike.%${phone}%`);

  return conditions.join(",");
}
