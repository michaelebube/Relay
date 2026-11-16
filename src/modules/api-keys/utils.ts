import crypto from "crypto";

export function generateApiKey(): { rawKey: string; keyPrefix: string } {
    const randomString = crypto.randomBytes(32).toString("hex");
    const rawKey = `rl_live_${randomString}`;
    const keyPrefix = rawKey.slice(0,12);

    return {rawKey, keyPrefix}
}

export function hashApiKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest("hex")
}