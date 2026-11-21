import crypto from "crypto";
import { generateWebhookSignature } from "./signature";

export interface SendWebhookInput {
  url: string;
  signingSecret: string;
  event: {
    id: string;
    eventType: string;
    createdAt: Date;
    payload: unknown;
  };
  timeoutMs?: number;
}

export interface SendWebhookResult {
  success: boolean;
  statusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  durationMs: number;
}


export async function sendWebhookRequest(input: SendWebhookInput): Promise<SendWebhookResult> {
    const bodyString = JSON.stringify({
        id: input.event.id,
        type: input.event.eventType,
        createdAt: input.event.createdAt.toISOString(),
        data: input.event.payload,
    })

    const signature = generateWebhookSignature(bodyString, input.signingSecret);

    const startTime = Date.now();

    try {
        const response = await fetch(input.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Relay-Event-Id': input.event.id,
                'X-Relay-Event-Type': input.event.eventType,
                'X-Relay-Signature': signature,
            },
            body: bodyString,
            redirect: 'manual',
            signal: AbortSignal.timeout(input.timeoutMs ?? 10000),
        });

        const durationMs = Date.now() - startTime;

        const responseBody = (await response.text()).slice(0, 1000); // Limit to first 1000 characters

        const isSuccess = response.status >= 200 && response.status < 300;

        return {
            success: isSuccess,
            statusCode: response.status,
            responseBody,
            errorMessage: isSuccess ? null : `HTTP ${response.status}`,
            durationMs,
        };
    } catch (error: any) {
        const durationMs = Date.now() - startTime;
        
        return {
            success: false,
            statusCode: null,
            responseBody: null,
            errorMessage: error instanceof Error ? error.message : 'Network error',
            durationMs,
        };
    }
}