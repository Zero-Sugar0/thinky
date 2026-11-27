import type { DeliveryChannel } from "../../shared/types/delivery.js";
import { appOrigin, internalHeaders } from "./internal-api.js";

/** Stores where the agent can reach a user on a channel, e.g. the iMessage thread they just messaged from. */
export async function saveDeliveryTarget(userId: string, channel: DeliveryChannel, target: string) {
  const response = await fetch(`${appOrigin()}/api/internal/delivery-targets`, {
    method: "POST",
    headers: { ...internalHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ userId, channel, target }),
  });
  if (!response.ok) {
    throw new Error(`Saving delivery target failed with ${response.status}`);
  }
}
