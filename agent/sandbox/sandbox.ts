import { defineSandbox } from "eve/sandbox";
import { vercel } from "eve/sandbox/vercel";

import { daytona } from "./daytona.js";

// Daytona is used as soon as DAYTONA_API_KEY is set. Without it, sandboxes run on Vercel.
export default defineSandbox({
  backend: process.env.DAYTONA_API_KEY?.trim()
    ? daytona()
    : vercel({ resources: { vcpus: 2 } }),
});
