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
