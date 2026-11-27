import { z } from "zod";
import { DELIVERY_CHANNELS } from "#shared/types/delivery";

export const deliveryTargetSchema = z.object({
  userId: z.string().trim().min(1),
  channel: z.enum(DELIVERY_CHANNELS),
  target: z.string().trim().min(1).max(500),
});

export const deliveryTargetQuerySchema = z.object({
  userId: z.string().trim().min(1),
});
