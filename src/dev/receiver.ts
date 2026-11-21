import express from "express";

const receiverApp = express();
const RECEIVER_PORT = Number(process.env.RECEIVER_PORT) || 4000;

receiverApp.use(express.json());

// Match POST /webhooks/test as well as any /webhooks/:channel (like /webhooks/wallet)
receiverApp.post(["/webhooks/test", "/webhooks/:channel"], async (req, res) => {
  const eventId = req.headers["x-relay-event-id"];
  const eventType = req.headers["x-relay-event-type"];
  const signature = req.headers["x-relay-signature"];

  console.log("\n==========================================");
  console.log(`[Receiver] Webhook received on ${req.path}`);
  console.log(`Event ID:   ${eventId}`);
  console.log(`Event Type: ${eventType}`);
  console.log(`Signature:  ${signature}`);
  console.log("Payload:", JSON.stringify(req.body, null, 2));
  console.log("==========================================");

  const payloadData = req.body?.data ?? {};

  // Optional: simulate a slow/hanging server to test Relay's 10s request timeout
  if (typeof payloadData.simulateDelayMs === "number") {
    console.log(`[Receiver] Simulating ${payloadData.simulateDelayMs}ms delay...`);
    await new Promise((resolve) => setTimeout(resolve, payloadData.simulateDelayMs));
  }

  // Optional: simulate specific HTTP status codes (e.g., 400 or 500) to test retry policy
  if (typeof payloadData.simulateStatus === "number") {
    console.log(`[Receiver] Simulating HTTP ${payloadData.simulateStatus} response`);
    return res.status(payloadData.simulateStatus).json({
      received: false,
      simulatedStatus: payloadData.simulateStatus,
    });
  }

  return res.status(200).json({
    received: true,
    eventId,
  });
});

receiverApp.listen(RECEIVER_PORT, () => {
  console.log(`Test webhook receiver listening on http://localhost:${RECEIVER_PORT}/webhooks/test`);
});
