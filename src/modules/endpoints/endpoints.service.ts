import crypto from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { endpoints, endpointSubscriptions } from "../../db/schema";
import { CreateEndpointInput, UpdateEndpointInput } from "./endpoints.validation";

function generateSigningSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

export async function createEndpoint(clientId: string, data: CreateEndpointInput) {
  const signingSecret = generateSigningSecret();

  return await db.transaction(async (tx) => {
    const [endpoint] = await tx
      .insert(endpoints)
      .values({
        clientId,
        url: data.url,
        description: data.description,
        signingSecret,
      })
      .returning();

    const subscriptionRows = data.subscriptions.map((eventType) => ({
      endpointId: endpoint.id,
      eventType,
    }));

    await tx.insert(endpointSubscriptions).values(subscriptionRows);

    return {
      ...endpoint,
      subscriptions: data.subscriptions,
    };
  });
}

export async function listEndpoints(clientId: string) {
  const clientEndpoints = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.clientId, clientId));

  if (clientEndpoints.length === 0) {
    return [];
  }

  const endpointIds = clientEndpoints.map((ep) => ep.id);

  const subscriptions = await db
    .select()
    .from(endpointSubscriptions)
    .where(inArray(endpointSubscriptions.endpointId, endpointIds));

  return clientEndpoints.map(({ signingSecret, ...endpoint }) => ({
    ...endpoint,
    subscriptions: subscriptions
      .filter((sub) => sub.endpointId === endpoint.id)
      .map((sub) => sub.eventType),
  }));
}

export async function getEndpointById(clientId: string, endpointId: string) {
  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(and(eq(endpoints.id, endpointId), eq(endpoints.clientId, clientId)));

  if (!endpoint) {
    return null;
  }

  const subscriptions = await db
    .select()
    .from(endpointSubscriptions)
    .where(eq(endpointSubscriptions.endpointId, endpoint.id));

  const { signingSecret, ...safeEndpoint } = endpoint;

  return {
    ...safeEndpoint,
    subscriptions: subscriptions.map((sub) => sub.eventType),
  };
}

export async function updateEndpoint(
  clientId: string,
  endpointId: string,
  data: UpdateEndpointInput
) {
  return await db.transaction(async (tx) => {
    const [updatedEndpoint] = await tx
      .update(endpoints)
      .set({
        ...(data.url !== undefined && { url: data.url }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        updatedAt: new Date(),
      })
      .where(and(eq(endpoints.id, endpointId), eq(endpoints.clientId, clientId)))
      .returning();

    if (!updatedEndpoint) {
      return null;
    }

    if (data.subscriptions !== undefined) {
      await tx
        .delete(endpointSubscriptions)
        .where(eq(endpointSubscriptions.endpointId, endpointId));

      const subscriptionRows = data.subscriptions.map((eventType) => ({
        endpointId,
        eventType,
      }));

      await tx.insert(endpointSubscriptions).values(subscriptionRows);
    }

    const currentSubscriptions = await tx
      .select()
      .from(endpointSubscriptions)
      .where(eq(endpointSubscriptions.endpointId, endpointId));

    const { signingSecret, ...safeEndpoint } = updatedEndpoint;

    return {
      ...safeEndpoint,
      subscriptions: currentSubscriptions.map((sub) => sub.eventType),
    };
  });
}

export async function deleteEndpoint(clientId: string, endpointId: string) {
  const [deletedEndpoint] = await db
    .delete(endpoints)
    .where(and(eq(endpoints.id, endpointId), eq(endpoints.clientId, clientId)))
    .returning();

  if (!deletedEndpoint) {
    return null;
  }

  const { signingSecret, ...safeEndpoint } = deletedEndpoint;
  return safeEndpoint;
}
