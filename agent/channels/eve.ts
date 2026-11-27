import type { AuthFn } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { vercelOidc } from "eve/channels/auth";
import { auth } from "../../auth";

function appSession(): AuthFn<Request> {
  return async (request) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return null;
    }

    return {
      attributes: {
        email: session.user.email,
        name: session.user.name,
      },
      authenticator: "app",
      issuer: "app",
      principalId: session.user.id,
      principalType: "user",
    };
  };
}

function internalBridge(): AuthFn<Request> {
  return async (request) => {
    const secret = process.env.INTERNAL_API_SECRET?.trim();
    const authorization = request.headers.get("authorization") ?? "";
    const onBehalfOf = request.headers.get("x-on-behalf-of")?.trim();

    if (!secret || !onBehalfOf || authorization !== `Bearer ${secret}`) {
      return null;
    }

    // Trusted server-to-server call for a meeting owner. Acting as the owner keeps
    // their memory, tasks, and connectors in scope.
    return {
      attributes: {},
      authenticator: "internal-bridge",
      issuer: "internal",
      principalId: onBehalfOf,
      principalType: "user",
    };
  };
}

export default eveChannel({
  auth: [
    internalBridge(),
    appSession(),
    vercelOidc(),
  ],
});
