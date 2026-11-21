import crypto from "crypto";

export function generateWebhookSignature(
  rawPayload: string,
  signingSecret: string
): string {
  const hmac = crypto
    .createHmac("sha256", signingSecret)
    .update(rawPayload)
    .digest("hex");

  return `sha256=${hmac}`;
}

export function verifyWebhookSignature(
  rawPayload: string,
  signingSecret: string,
  receivedSignature: string
): boolean {
  const expectedSignature = generateWebhookSignature(rawPayload, signingSecret);

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(receivedSignature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}