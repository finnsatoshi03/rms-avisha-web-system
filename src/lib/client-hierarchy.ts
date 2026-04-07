import { Client } from "./types";

type ClientLike = Partial<
  Pick<
    Client,
    | "id"
    | "name"
    | "parent_client_id"
    | "parent_name"
    | "display_name"
    | "parent_client"
  >
>;

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeClientText(value: string | null | undefined): string {
  if (!value) return "";
  return normalizeWhitespace(value).toLowerCase();
}

export function isParentClient(client: ClientLike | null | undefined): boolean {
  if (!client) return false;
  return client.parent_client_id == null;
}

export function getParentClientName(
  client: ClientLike | null | undefined
): string | null {
  if (!client) return null;
  if (client.parent_name) return normalizeWhitespace(client.parent_name);
  if (client.parent_client?.name) return normalizeWhitespace(client.parent_client.name);
  return null;
}

export function getClientDisplayName(
  client: ClientLike | null | undefined,
  fallback = "—"
): string {
  if (!client?.name) return fallback;

  if (client.display_name) {
    return normalizeWhitespace(client.display_name);
  }

  const ownName = normalizeWhitespace(client.name);
  const parentName = getParentClientName(client);

  if (!parentName || client.parent_client_id == null) {
    return ownName;
  }

  return `${parentName} — ${ownName}`;
}

export function getClientRollupKey(
  client: ClientLike | null | undefined
): string {
  if (!client) return "unknown";

  if (client.parent_client_id != null) {
    return `root:${client.parent_client_id}`;
  }

  if (typeof client.id === "number" && Number.isFinite(client.id)) {
    return `root:${client.id}`;
  }

  return `name:${normalizeClientText(client.name || "")}`;
}

export function stripParentPrefix(
  compositeName: string,
  parentName: string
): string | null {
  const normalizedComposite = normalizeWhitespace(compositeName);
  const normalizedParent = normalizeWhitespace(parentName);
  if (!normalizedComposite || !normalizedParent) return null;

  const regex = new RegExp(`^${escapeRegExp(normalizedParent)}\\s*`, "i");
  const stripped = normalizedComposite.replace(regex, "").trim();
  if (!stripped) return null;
  return stripped;
}

