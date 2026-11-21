import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { deliveries, deliveryAttempts } from "../../db/schema";

const MAX_STORED_TEXT_LENGTH = 1000;

export interface RecordDeliveryAttemptInput {
  deliveryId: string;
  success: boolean;
  httpStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  durationMs: number;
}

function truncateText(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.slice(0, MAX_STORED_TEXT_LENGTH);
}

export async function recordDeliveryAttempt(input: RecordDeliveryAttemptInput) {
  const now = new Date();
  const attemptStatus = input.success ? "success" : "failed";

  return await db.transaction(async (tx) => {
    // Step 1: Atomically increment attempt_count on the parent delivery row
    // so concurrent workers can never generate the same attemptNumber.
    const [updatedDelivery] = await tx
      .update(deliveries)
      .set({
        attemptCount: sql`${deliveries.attemptCount} + 1`,
        lastAttemptAt: now,
        updatedAt: now,
      })
      .where(eq(deliveries.id, input.deliveryId))
      .returning();

    if (!updatedDelivery) {
      throw new Error(`Delivery ${input.deliveryId} not found`);
    }

    // Step 2: Insert the historical attempt row using the freshly incremented attemptCount.
    const [attempt] = await tx
      .insert(deliveryAttempts)
      .values({
        deliveryId: input.deliveryId,
        attemptNumber: updatedDelivery.attemptCount,
        status: attemptStatus,
        httpStatus: input.httpStatus,
        responseBody: truncateText(input.responseBody),
        errorMessage: truncateText(input.errorMessage),
        durationMs: input.durationMs,
      })
      .returning();

    return {
      attempt,
      delivery: updatedDelivery,
    };
  });
}
