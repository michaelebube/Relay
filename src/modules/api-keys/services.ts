import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { apiKeys } from "../../db/schema";
import { generateApiKey, hashApiKey } from "./utils";

export async function createApiKey(clientId: string, name: string) {
const {rawKey, keyPrefix} = generateApiKey();

const keyHash = hashApiKey(rawKey)

const [createdKey] = await db.insert(apiKeys).values({
    clientId,
    name,
    keyHash,
    keyPrefix
}).returning();

return { ...createdKey, rawKey };
}

export async function revokeApiKey(keyId: string, clientId: string) {
  const [revokedKey] = await db
  .update(apiKeys)
  .set({ revokedAt: new Date() })
  .where(and(eq(apiKeys.id, keyId), eq(apiKeys.clientId, clientId)))
  .returning();

return revokedKey ?? null;
}