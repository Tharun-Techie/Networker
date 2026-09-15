import { z } from "zod";
import { CONFIDENCES, NODE_TYPES } from "@networker/shared";
import { ApiError } from "./api-error";

export const nodeCreateSchema = z.object({
  id: z.string().min(1).max(128).optional(),
  type: z.enum(NODE_TYPES),
  name: z.string().min(1).max(500),
  aliases: z.array(z.string()).default([]),
  attributes: z.record(z.unknown()).default({}),
});

export const edgeCreateSchema = z.object({
  rel_type: z.string().min(1),
  from_id: z.string().min(1),
  to_id: z.string().min(1),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  source: z.string().min(1),
  confidence: z.enum(CONFIDENCES).default("unconfirmed"),
  note: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
});

export const evidenceCreateSchema = z.object({
  title: z.string().min(1).max(500),
  source_url: z.string().nullable().optional(),
  s3_key: z.string().nullable().optional(),
  quote: z.string().nullable().optional(),
  page_ref: z.string().nullable().optional(),
  added_by: z.string().nullable().optional(),
  doc_metadata: z.record(z.unknown()).default({}),
});

export const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(256),
  role: z.string().max(32).default("editor"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const confidenceSchema = z.enum(CONFIDENCES);

export function parseOr400<T extends z.ZodTypeAny>(schema: T, data: unknown): z.output<T> {
  const res = schema.safeParse(data);
  if (!res.success) {
    throw new ApiError(400, res.error.issues.map((i) => i.message).join("; "));
  }
  return res.data;
}
