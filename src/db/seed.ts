import { createApiKey } from "../modules/api-keys/services";
import { clients } from "./schema";
import { pool, db } from "./index";

export async function seedDatabase() {
    // Create a client

const [client] = await db
  .insert(clients)
  .values({ name: "PayPower" })
  .returning();

  const apiKey = await createApiKey(client.id, "Production Key")

console.log("Seeded client:", client.name, `(${client.id})`);
console.log("API Key (save this now, it won't be shown again!):");
console.log(apiKey.rawKey);


}

seedDatabase()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });