import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { workerRedisConnection } from "../config/redis";
import { db } from "../db";
import { deliveries, endpoints, events } from "../db/schema";
import { scheduleDeliveryRetry } from "../modules/deliveries/deliveries.service";
import { recordDeliveryAttempt } from "../modules/deliveries/delivery-attempts.service";
import { sendWebhookRequest } from "../modules/deliveries/http-delivery";
import { evaluateRetryPolicy } from "../modules/deliveries/retry-policy";
import { DELIVERY_QUEUE_NAME, DeliveryJobData } from "../queues/delivery.queue";

export const deliveryWorker = new Worker<DeliveryJobData>(
  DELIVERY_QUEUE_NAME,
  async (job) => {
    const { deliveryId } = job.data;

    // Step 1: Retrieve the delivery alongside its associated event and endpoint.
    const [record] = await db
      .select({
        delivery: deliveries,
        event: events,
        endpoint: endpoints,
      })
      .from(deliveries)
      .innerJoin(events, eq(deliveries.eventId, events.id))
      .innerJoin(endpoints, eq(deliveries.endpointId, endpoints.id))
      .where(eq(deliveries.id, deliveryId));

    if (!record) {
      console.warn(`Delivery ${deliveryId} no longer exists. Skipping.`);
      return;
    }

    const { delivery, event, endpoint } = record;

    // Step 2: Check current state — do not re-send terminal deliveries.
    if (delivery.status === "success" || delivery.status === "failed") {
      console.log(
        `Delivery ${deliveryId} already has terminal status '${delivery.status}'. Skipping.`
      );
      return;
    }

    // If the customer disabled the endpoint before delivery ran, mark it failed and stop.
    if (!endpoint.enabled) {
      await db
        .update(deliveries)
        .set({
          status: "failed",
          nextAttemptAt: null,
          updatedAt: new Date(),
        })
        .where(eq(deliveries.id, deliveryId));

      console.log(
        `Endpoint ${endpoint.id} is disabled. Marking delivery ${deliveryId} as failed.`
      );
      return;
    }

    // Mark delivery as currently processing.
    await db
      .update(deliveries)
      .set({
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(deliveries.id, deliveryId));

    // Steps 3, 4 & 5: Construct envelope, sign with HMAC-SHA256, and send HTTP POST.
    const result = await sendWebhookRequest({
      url: endpoint.url,
      signingSecret: endpoint.signingSecret,
      event: {
        id: event.id,
        eventType: event.eventType,
        createdAt: event.createdAt,
        payload: event.payload,
      },
    });

    // Step 6: Record the attempt in delivery_attempts and atomically increment attemptCount.
    const { delivery: updatedDelivery } = await recordDeliveryAttempt({
      deliveryId,
      success: result.success,
      httpStatus: result.statusCode,
      responseBody: result.responseBody,
      errorMessage: result.errorMessage,
      durationMs: result.durationMs,
    });

    // Step 7: Update delivery status based on outcome and retry policy.
    if (result.success) {
      await db
        .update(deliveries)
        .set({
          status: "success",
          nextAttemptAt: null,
          updatedAt: new Date(),
        })
        .where(eq(deliveries.id, deliveryId));

      console.log(
        `[Worker] Delivery ${deliveryId} succeeded on attempt #${updatedDelivery.attemptCount} (HTTP ${result.statusCode} in ${result.durationMs}ms)`
      );
      return;
    }

    const retryDecision = evaluateRetryPolicy(
      updatedDelivery.attemptCount,
      result.statusCode
    );

    if (retryDecision.shouldRetry && retryDecision.delayMs !== null) {
      await db
        .update(deliveries)
        .set({
          status: "retrying",
          nextAttemptAt: retryDecision.nextAttemptAt,
          updatedAt: new Date(),
        })
        .where(eq(deliveries.id, deliveryId));

      await scheduleDeliveryRetry(
        deliveryId,
        updatedDelivery.attemptCount,
        retryDecision.delayMs
      );

      console.warn(
        `[Worker] Delivery ${deliveryId} failed on attempt #${updatedDelivery.attemptCount} (${result.errorMessage}). Scheduled retry in ${retryDecision.delayMs / 1000}s.`
      );
      return;
    }

    await db
      .update(deliveries)
      .set({
        status: "failed",
        nextAttemptAt: null,
        updatedAt: new Date(),
      })
      .where(eq(deliveries.id, deliveryId));

    console.error(
      `[Worker] Delivery ${deliveryId} permanently failed on attempt #${updatedDelivery.attemptCount} (${result.errorMessage}). Exhausted: ${retryDecision.exhausted}`
    );
  },
  {
    connection: workerRedisConnection,
  }
);

deliveryWorker.on("active", (job) => {
  console.log(
    `[Worker] Job ${job.id} started (deliveryId: ${job.data.deliveryId})`
  );
});

deliveryWorker.on("completed", (job) => {
  console.log(
    `[Worker] Job ${job.id} completed (deliveryId: ${job.data.deliveryId})`
  );
});

deliveryWorker.on("failed", (job, err) => {
  console.error(
    `[Worker] Job ${job?.id} failed (deliveryId: ${job?.data.deliveryId}):`,
    err.message
  );
});

deliveryWorker.on("error", (err) => {
  console.error("[Worker] Worker error:", err);
});
