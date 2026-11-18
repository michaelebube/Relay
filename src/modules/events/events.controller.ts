import {Request, Response} from "express";
import {z} from "zod";
import {getClientId} from "../../middleware/authenticate";
import {createEventSchema} from "./events.validation";
import * as eventsService from "./events.service";


export async function createEventHandler(req: Request, res: Response) {
    const clientId = getClientId(req);

    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: "Validation failed",
            details: z.flattenError(parsed.error).fieldErrors,
        });
    }

    const result = await eventsService.createEvent(clientId, parsed.data);
    return res.status(202).json({
        message: result.duplicate ? "Event already accepted" : "Event accepted", 
        event: {
        id: result.event.id,
        eventType: result.event.eventType,
        status: "accepted",
    },
        deliveriesCreated: result.deliveries.length,
    });
}
