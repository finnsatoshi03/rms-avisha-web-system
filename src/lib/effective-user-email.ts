type UserWithMigrationEmail = {
  email?: string | null;
  migrated_email?: string | null;
};

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

export function getEffectiveUserEmail(
  user: UserWithMigrationEmail | null | undefined
) {
  if (!user) {
    return null;
  }

  return normalizeEmail(user.migrated_email) || normalizeEmail(user.email);
}

export function withEffectiveUserEmail<T extends UserWithMigrationEmail>(
  user: T | null | undefined
): T | null | undefined {
  if (!user) {
    return user;
  }

  const effectiveEmail = getEffectiveUserEmail(user);
  if (!effectiveEmail || normalizeEmail(user.email) === effectiveEmail) {
    return user;
  }

  return {
    ...user,
    email: effectiveEmail,
  } as T;
}
