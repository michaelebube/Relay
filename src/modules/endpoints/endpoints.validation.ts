import { z } from "zod";

const httpUrlSchema = z.url({
  protocol: /^https?$/,
  error: "Must be a valid http:// or https:// URL",
});

const subscriptionsSchema = z
  .array(z.string().trim().min(1, "Event type cannot be empty"))
  .min(1, "At least one event subscription is required")
  .transform((events) => Array.from(new Set(events)));

export const createEndpointSchema = z.object({
  url: httpUrlSchema,
  description: z.string().trim().min(1).optional(),
  subscriptions: subscriptionsSchema,
});

export const updateEndpointSchema = z
  .object({
    url: httpUrlSchema.optional(),
    description: z.string().trim().min(1).nullable().optional(),
    enabled: z.boolean().optional(),
    subscriptions: subscriptionsSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type CreateEndpointInput = z.infer<typeof createEndpointSchema>;
export type UpdateEndpointInput = z.infer<typeof updateEndpointSchema>;
