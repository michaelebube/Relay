import {Request, Response, NextFunction} from "express";
import {eq} from "drizzle-orm";
import {db} from "../db";
import {apiKeys} from "../db/schema";
import {hashApiKey} from "../modules/api-keys/utils";

declare global {
  namespace Express {
    interface Request {
      clientId?: string;
    }
  }
}

export async function authenticateMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const rawKey = authHeader.slice(7).trim();

    if (!rawKey) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const keyHash = hashApiKey(rawKey);

    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));

    if (!apiKey || apiKey.revokedAt) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    req.clientId = apiKey.clientId;
    next();
}

export function getClientId(req: Request): string {
    if (!req.clientId) {
        throw new Error("Authenticated clientId is missing on request");
    }
    return req.clientId;
}