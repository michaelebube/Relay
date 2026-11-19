import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { workerRedisConnection } from "../config/redis";
import { db } from "../db";
import { deliveries } from "../db/schema";
import { DELIVERY_QUEUE_NAME, DeliveryJobData } from "../queues/delivery.queue";

export const deliveryWorker = new Worker<DeliveryJobData>(
  DELIVERY_QUEUE_NAME,
  async (job) => {
    const { deliveryId } = job.data;

    const [delivery] = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, deliveryId));

    if (!delivery) {
      console.warn(`Delivery ${deliveryId} no longer exists. Skipping.`);
      return;
    }

    if (delivery.status === "success" || delivery.status === "failed") {
      console.log(
        `Delivery ${deliveryId} already has status '${delivery.status}'. Skipping.`
      );
      return;
    }

    await db
      .update(deliveries)
      .set({
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(deliveries.id, deliveryId));

    console.log(
      `Processing delivery ${deliveryId} for event ${delivery.eventId}`
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
