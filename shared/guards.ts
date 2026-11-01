export function isObject(e: unknown): e is Record<string, unknown> {
  return typeof e === "object" && !!e && !Array.isArray(e);
}

export function isNonEmptyString(e: unknown): e is string {
  return typeof e === "string" && e.length > 0;
}

export function readNonEmptyString(e: unknown): string | undefined {
  return isNonEmptyString(e) ? e : undefined;
}

export function isThenable(e: unknown): e is PromiseLike<unknown> {
  return isObject(e) && typeof (e as { then?: unknown }).then === "function";
}

export function isErrnoCode(e: unknown, t: string): boolean {
  return e instanceof Error && "code" in e && (e as { code?: unknown }).code === t;
}

export function isPlainRecord(e: unknown): e is Record<string, unknown> {
  if (!isObject(e)) return false;
  const t = Object.getPrototypeOf(e);
  return t === Object.prototype || t === null;
}
