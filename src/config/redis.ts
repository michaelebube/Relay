import "dotenv/config";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL environment variable is not set");
}

export const queueRedisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const workerRedisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});