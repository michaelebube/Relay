import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { deliveries, endpoints, endpointSubscriptions, events } from "../../db/schema";
import { CreateEventInput } from "./events.validation";

export async function createEvent(clientId: string, data: CreateEventInput) {
  return await db.transaction(async (tx) => {
    // Step 1: Attempt to insert the event atomically.
    // If (clientId, idempotencyKey) already exists, Postgres skips the insert
    // instead of throwing an error, and `insertedEvent` will be undefined.
    const [insertedEvent] = await tx
      .insert(events)
      .values({
        clientId,
        eventType: data.eventType,
        payload: data.payload,
        idempotencyKey: data.idempotencyKey,
      })
      .onConflictDoNothing({
        target: [events.clientId, events.idempotencyKey],
      })
      .returning();

    // Step 2: Handle duplicate idempotent requests.
    // Note: For MVP, if the same idempotencyKey is sent again (even with a different payload),
    // we return the original event and its existing deliveries without creating new deliveries.
    if (!insertedEvent) {
      const [existingEvent] = await tx
        .select()
        .from(events)
        .where(
          and(
            eq(events.clientId, clientId),
            eq(events.idempotencyKey, data.idempotencyKey!)
          )
        );

      const existingDeliveries = await tx
        .select()
        .from(deliveries)
        .where(eq(deliveries.eventId, existingEvent.id));

      return {
        event: existingEvent,
        deliveries: existingDeliveries,
        duplicate: true,
      };
    }

    // Step 3: Find all enabled endpoints for this client subscribed to this eventType.
    const matchingEndpoints = await tx
      .select({
        id: endpoints.id,
      })
      .from(endpoints)
      .innerJoin(
        endpointSubscriptions,
        eq(endpoints.id, endpointSubscriptions.endpointId)
      )
      .where(
        and(
          eq(endpoints.clientId, clientId),
          eq(endpoints.enabled, true),
          eq(endpointSubscriptions.eventType, data.eventType)
        )
      );

    // Step 4: Create a pending delivery record for each matching endpoint.
    let createdDeliveries: (typeof deliveries.$inferSelect)[] = [];

    if (matchingEndpoints.length > 0) {
      createdDeliveries = await tx
        .insert(deliveries)
        .values(
          matchingEndpoints.map((endpoint) => ({
            eventId: insertedEvent.id,
            endpointId: endpoint.id,
            status: "pending",
            attemptCount: 0,
            nextAttemptAt: new Date(),
          }))
        )
        .returning();
    }

    return {
      event: insertedEvent,
      deliveries: createdDeliveries,
      duplicate: false,
    };
  });
}
