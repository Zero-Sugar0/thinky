import { Buffer } from "node:buffer";

import { Daytona, type Sandbox as DaytonaSandbox } from "@daytonaio/sdk";
import type {
  SandboxBackend,
  SandboxBackendCreateInput,
  SandboxBackendHandle,
  SandboxBackendPrewarmInput,
  SandboxSeedFile,
  SandboxSession,
} from "eve/sandbox";

/**
 * Daytona sandbox backend for eve. Each eve session gets its own Daytona sandbox,
 * named after the session and reattached on the next turn.
 *
 * Configuration (environment):
 * - DAYTONA_API_KEY: required. Its presence selects this backend (see sandbox.ts).
 * - DAYTONA_API_URL: optional, for a self-hosted Daytona API.
 * - DAYTONA_TARGET: optional region.
 * - DAYTONA_IMAGE: optional Docker image. Without it, Daytona's default snapshot is used.
 * - DAYTONA_AUTO_STOP_MINUTES: optional idle timeout before Daytona stops a sandbox. Default 60.
 */

const WORKSPACE = "/workspace";
const DEFAULT_AUTO_STOP_MINUTES = 60;
const COMMAND_TIMEOUT_SECONDS = 600;

type SeedTable = Map<string, SandboxSeedFile[]>;

export function daytona(): SandboxBackend {
  const seeds: SeedTable = new Map();

  return {
    name: "daytona",

    async create(input: SandboxBackendCreateInput): Promise<SandboxBackendHandle> {
      const client = createClient();
      const name = sandboxNameFor(input.sessionKey);
      const existingName =
        typeof input.existingMetadata?.sandboxName === "string"
          ? (input.existingMetadata.sandboxName as string)
          : name;

      let sandbox: DaytonaSandbox | undefined;
      try {
        sandbox = await client.get(existingName);
      } catch {
        sandbox = undefined;
      }

      if (sandbox) {
        if (sandbox.state !== "started") {
          await sandbox.start();
        }
      } else {
        sandbox = await createSandbox(client, name, input);
        const templateSeeds = input.templateKey ? seeds.get(input.templateKey) : undefined;
        if (templateSeeds?.length) {
          await writeSeeds(sandbox, templateSeeds);
        }
      }

      await runOrThrow(sandbox, `mkdir -p ${WORKSPACE}`);
      return createHandle(client, sandbox, input.sessionKey, existingName);
    },

    async prewarm(input: SandboxBackendPrewarmInput): Promise<{ reused: boolean }> {
      // Daytona has no snapshot-per-template step here. Seed files are applied when a
      // new sandbox for this template is created, so they are kept in memory.
      if (input.bootstrap) {
        input.log?.("Daytona backend does not run sandbox bootstrap functions; skipping.");
      }
      seeds.set(input.templateKey, [...input.seedFiles]);
      return { reused: false };
    },
  };
}

function createClient(): Daytona {
  const apiKey = process.env.DAYTONA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("DAYTONA_API_KEY is required to use the Daytona sandbox backend.");
  }

  return new Daytona({
    apiKey,
    apiUrl: process.env.DAYTONA_API_URL?.trim() || undefined,
    target: process.env.DAYTONA_TARGET?.trim() || undefined,
  });
}

async function createSandbox(
  client: Daytona,
  name: string,
  input: SandboxBackendCreateInput,
): Promise<DaytonaSandbox> {
  const autoStopInterval = Number(process.env.DAYTONA_AUTO_STOP_MINUTES) || DEFAULT_AUTO_STOP_MINUTES;
  const base = {
    name,
    labels: { ...(input.tags ?? {}), eve: "true", sessionKey: input.sessionKey },
    autoStopInterval,
  };

  const image = process.env.DAYTONA_IMAGE?.trim();
  if (image) {
    return client.create({ ...base, image }, { timeout: 300 });
  }
  return client.create(base, { timeout: 300 });
}

function createHandle(
  client: Daytona,
  sandbox: DaytonaSandbox,
  sessionKey: string,
  sandboxName: string,
): SandboxBackendHandle {
  return {
    session: buildSession(sandbox, sessionKey),
    useSessionFn: async () => buildSession(sandbox, sessionKey),
    async captureState() {
      return {
        backendName: "daytona",
        metadata: { sandboxName },
        sessionKey,
      };
    },
    async delete() {
      await client.delete(sandbox);
    },
    async stop() {
      await sandbox.stop();
    },
    async shutdown() {
      try {
        await sandbox.stop();
      } catch {
        // Process-wide shutdown continues even when a sandbox is already gone.
      }
    },
  };
}

function buildSession(sandbox: DaytonaSandbox, sessionKey: string): SandboxSession {
  return {
    id: sessionKey,
    description: `Daytona sandbox ${sandbox.id} (${WORKSPACE})`,

    resolvePath(path: string) {
      return path.startsWith("/") ? path : `${WORKSPACE}/${path}`;
    },

    async run({ command, workingDirectory, env }) {
      const response = await sandbox.process.executeCommand(
        `bash -lc ${shellQuote(command)}`,
        workingDirectory ?? WORKSPACE,
        env,
        COMMAND_TIMEOUT_SECONDS,
      );
      return { exitCode: response.exitCode, stdout: response.result ?? "", stderr: "" };
    },

    async spawn({ command, workingDirectory, env }) {
      // Runs to completion and exposes its output as a process handle. Long-running
      // servers need a Daytona session; this backend does not manage them yet.
      const response = await sandbox.process.executeCommand(
        `bash -lc ${shellQuote(command)}`,
        workingDirectory ?? WORKSPACE,
        env,
        COMMAND_TIMEOUT_SECONDS,
      );
      const output = Buffer.from(response.result ?? "");
      return {
        pid: undefined,
        stdout: bytesStream(output),
        stderr: bytesStream(Buffer.alloc(0)),
        wait: async () => ({ exitCode: response.exitCode }),
        kill: async () => {},
      };
    },

    async readFile({ path }) {
      return bytesStream(await sandbox.fs.downloadFile(resolve(path)));
    },

    async readBinaryFile({ path }) {
      return new Uint8Array(await sandbox.fs.downloadFile(resolve(path)));
    },

    async readTextFile({ path, startLine, endLine }) {
      const text = (await sandbox.fs.downloadFile(resolve(path))).toString("utf8");
      if (startLine === undefined && endLine === undefined) return text;
      const lines = text.split("\n");
      return lines.slice((startLine ?? 1) - 1, endLine ?? lines.length).join("\n");
    },

    async writeFile({ path, content }) {
      await writeBytes(sandbox, resolve(path), await readStream(content));
    },

    async writeBinaryFile({ path, content }) {
      await writeBytes(sandbox, resolve(path), Buffer.from(content));
    },

    async writeTextFile({ path, content }) {
      await writeBytes(sandbox, resolve(path), Buffer.from(content, "utf8"));
    },

    async setNetworkPolicy() {
      // Daytona sets egress policy when the sandbox is created (DAYTONA_* network
      // options). Changing it mid-session is not supported by this backend.
    },

    async removePath({ path, force, recursive }) {
      const flags = [force ? "-f" : "", recursive ? "-r" : ""].filter(Boolean).join(" ");
      await runOrThrow(sandbox, `rm ${flags} ${shellQuote(resolve(path))}`.replace(/\s+/g, " "));
    },
  } as SandboxSession;

  function resolve(path: string): string {
    return path.startsWith("/") ? path : `${WORKSPACE}/${path}`;
  }
}

async function writeBytes(sandbox: DaytonaSandbox, path: string, bytes: Buffer): Promise<void> {
  const dir = path.slice(0, path.lastIndexOf("/")) || "/";
  await runOrThrow(sandbox, `mkdir -p ${shellQuote(dir)}`);
  await sandbox.fs.uploadFile(bytes, path, COMMAND_TIMEOUT_SECONDS);
}

async function writeSeeds(sandbox: DaytonaSandbox, files: SandboxSeedFile[]): Promise<void> {
  for (const file of files) {
    const path = file.path.startsWith("/") ? file.path : `${WORKSPACE}/${file.path}`;
    const bytes = typeof file.content === "string" ? Buffer.from(file.content, "utf8") : Buffer.from(file.content);
    await writeBytes(sandbox, path, bytes);
  }
}

async function runOrThrow(sandbox: DaytonaSandbox, command: string): Promise<string> {
  const response = await sandbox.process.executeCommand(command, undefined, undefined, COMMAND_TIMEOUT_SECONDS);
  if (response.exitCode !== 0) {
    throw new Error(`Daytona command failed (${response.exitCode}): ${command}\n${response.result ?? ""}`);
  }
  return response.result ?? "";
}

function sandboxNameFor(sessionKey: string): string {
  const safe = sessionKey.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return `eve-${safe}`.slice(0, 63);
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function readStream(content: ReadableStream<Uint8Array> | Uint8Array | string): Promise<Buffer> {
  if (typeof content === "string") return Buffer.from(content, "utf8");
  if (content instanceof Uint8Array) return Buffer.from(content);

  const chunks: Uint8Array[] = [];
  const reader = content.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function bytesStream(bytes: Buffer): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (bytes.length > 0) controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  });
}
