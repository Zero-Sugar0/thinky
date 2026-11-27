export function requireUserId(principalId: string | undefined): string {
  if (!principalId?.trim()) {
    throw new Error("This action requires an authenticated user identity.");
  }
  return principalId;
}
