import {eq, and} from "drizzle-orm"
import {db} from "../../db"
import {deliveries} from "../../db/schema"
import {deliveryQueue} from "../../queues/delivery.queue"

export async function enqueueDelivery(deliveryId: string) {
    await deliveryQueue.add("deliver-webhook", { deliveryId }, {jobId: deliveryId});
}

export async function scheduleDeliveryRetry(
    deliveryId: string,
    afterAttemptNumber: number,
    delayMs: number
) {
    await deliveryQueue.add(
        "deliver-webhook",
        { deliveryId },
        {
            jobId: `${deliveryId}:retry:${afterAttemptNumber}`,
            delay: delayMs,
        }
    );
}

export async function enqueueDeliveriesForEvent(eventId: string) {
    const pendingDeliveries = await db.select().from(deliveries).where(and(eq(deliveries.eventId, eventId), eq(deliveries.status, "pending")));

    await Promise.all(pendingDeliveries.map(delivery => enqueueDelivery(delivery.id)));

    return pendingDeliveries.length;
}
