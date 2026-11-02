export type CamofoxScreenshotUIToolInvocation = {
  state: string;
  errorText?: string;
  output?: {
    ok: boolean;
    mimeType: string;
    bytes: number;
    screenshotBase64: string;
  };
};

export type CamofoxOpenUIToolInvocation = {
  state: string;
  errorText?: string;
  output?: {
    tabId?: string;
    url?: string;
    title?: string | null;
    liveViewerUrl?: string;
    liveViewerExpiresInSeconds?: number;
    expiresInSeconds?: number;
    liveViewerError?: string;
  };
};
