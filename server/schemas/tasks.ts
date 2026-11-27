import { z } from "zod";

export const taskStatusSchema = z.enum(["open", "done", "cancelled", "all"]);
export const taskSourceSchema = z.enum(["chat", "meeting", "proactive", "slack", "telegram", "photon"]);

export const taskListQuerySchema = z.object({
  userId: z.string().trim().min(1),
  status: taskStatusSchema.default("open"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const taskCreateSchema = z.object({
  userId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(4000).default(""),
  dueAt: z.coerce.date().nullable().optional(),
  source: taskSourceSchema.default("chat"),
});

export const taskUpdateSchema = z.object({
  userId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().max(4000).optional(),
  dueAt: z.coerce.date().nullable().optional(),
  status: z.enum(["open", "done", "cancelled"]).optional(),
});

export const actionLogCreateSchema = z.object({
  userId: z.string().trim().min(1),
  toolSlug: z.string().trim().min(1).max(200),
  toolkit: z.string().trim().max(100).nullable().optional(),
  status: z.string().trim().min(1).max(50),
  summary: z.string().max(500).default(""),
  externalLogId: z.string().max(200).nullable().optional(),
});

export const actionLogListQuerySchema = z.object({
  userId: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
