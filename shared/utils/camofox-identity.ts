import { createHash } from "node:crypto";

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

export function createCamofoxUserId(principalId: string, appUrl?: string): string {
  const normalizedId = principalId.trim();
  if (!normalizedId || normalizedId.length > 512 || hasControlCharacters(normalizedId)) {
    throw new Error("The authenticated user identity is invalid for Camofox.");
  }

  const digest = createHash("sha256")
    .update(`thinky:camofox:v1:${appUrl ?? "thinky"}:${normalizedId}`)
    .digest("hex");
  return `thinky_${digest}`;
}
