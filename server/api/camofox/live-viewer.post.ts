import { z } from "zod";
import { createCamofoxUserId } from "~~/shared/utils/camofox-identity";
import { CAMOFOX_LIVE_VIEWER_TTL_SECONDS } from "~~/shared/utils/tools/camofox";
import { requireSessionUserId } from "~~/server/utils/session";

const InputSchema = z.object({
  tabId: z.string().trim().min(1).max(256).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/),
});

const MAX_RESPONSE_BYTES = 16 * 1024;

export default defineEventHandler(async (event) => {
  const principalId = await requireSessionUserId(event);
  const parsedInput = InputSchema.safeParse(await readBody(event));
  if (!parsedInput.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid browser tab ID." });
  }

  const baseUrlValue = process.env.CAMOFOX_BASE_URL?.trim();
  const accessKey = process.env.CAMOFOX_ACCESS_KEY?.trim();
  if (!baseUrlValue || !accessKey) {
    throw createError({ statusCode: 503, statusMessage: "Browser live view is not configured." });
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(baseUrlValue);
  } catch {
    throw createError({ statusCode: 503, statusMessage: "Browser service configuration is invalid." });
  }
  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.pathname !== "/" ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw createError({ statusCode: 503, statusMessage: "Browser service configuration is invalid." });
  }

  const userId = createCamofoxUserId(principalId, process.env.BETTER_AUTH_URL);
  const requestUrl = new URL("/live-viewer/links", baseUrl);
  requestUrl.searchParams.set("userId", userId);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "POST",
      cache: "no-store",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        tabId: parsedInput.data.tabId,
        ttlSeconds: CAMOFOX_LIVE_VIEWER_TTL_SECONDS,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw createError({ statusCode: 502, statusMessage: "Could not reach the browser service." });
  }

  if (!response.ok) {
    throw createError({
      statusCode: response.status === 404 ? 404 : 502,
      statusMessage: response.status === 404
        ? "The browser tab is no longer available."
        : "Could not refresh the browser live view.",
    });
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw createError({ statusCode: 502, statusMessage: "Browser service returned an invalid response." });
  }

  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw createError({ statusCode: 502, statusMessage: "Browser service returned an invalid response." });
    }
    chunks.push(value);
  }
  const responseBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    responseBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const responseText = new TextDecoder().decode(responseBytes);
  if (responseBytes.byteLength > MAX_RESPONSE_BYTES) {
    throw createError({ statusCode: 502, statusMessage: "Browser service returned an invalid response." });
  }

  let responseBody: unknown;
  try {
    responseBody = JSON.parse(responseText);
  } catch {
    throw createError({ statusCode: 502, statusMessage: "Browser service returned an invalid response." });
  }

  const parsedResponse = z.object({ url: z.string().url() }).safeParse(responseBody);
  if (!parsedResponse.success) {
    throw createError({ statusCode: 502, statusMessage: "Browser service returned an invalid viewer link." });
  }

  const viewerUrl = new URL(parsedResponse.data.url);
  if (
    viewerUrl.protocol !== "https:" ||
    viewerUrl.username ||
    viewerUrl.password ||
    !viewerUrl.searchParams.get("t")
  ) {
    throw createError({ statusCode: 502, statusMessage: "Browser service returned an invalid viewer link." });
  }

  setResponseHeader(event, "Cache-Control", "no-store");
  return {
    url: viewerUrl.toString(),
    expiresInSeconds: CAMOFOX_LIVE_VIEWER_TTL_SECONDS,
  };
});
