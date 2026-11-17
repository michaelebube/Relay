import {z} from "zod";

export const createEventSchema = z.object({
    eventType: z.string().trim().min(1, "Event type cannot be empty"),
    payload: z.record(z.string(), z.unknown()),
    idempotencyKey: z.string().trim().min(1, "Idempotency key (if the key is used, the value cannot be empty)").optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;