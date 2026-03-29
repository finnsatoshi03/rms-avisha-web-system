export const MANAGER_REAUTH_PASSWORD = "rmlacap09";

export function isManagerReauthPasswordValid(password: string): boolean {
  return password === MANAGER_REAUTH_PASSWORD;
}
