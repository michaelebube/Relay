import { Request, Response } from "express";
import { z } from "zod";
import { getClientId } from "../../middleware/authenticate";
import {
  createEndpointSchema,
  updateEndpointSchema,
} from "./endpoints.validation";
import * as endpointsService from "./endpoints.service";

const uuidParamSchema = z.uuid("Invalid endpoint ID format");

export async function createEndpointHandler(req: Request, res: Response) {
  const clientId = getClientId(req);

  const parsed = createEndpointSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: z.flattenError(parsed.error).fieldErrors,
    });
  }

  const endpoint = await endpointsService.createEndpoint(clientId, parsed.data);
  return res.status(201).json({ data: endpoint });
}

export async function listEndpointsHandler(req: Request, res: Response) {
  const clientId = getClientId(req);

  const endpoints = await endpointsService.listEndpoints(clientId);
  return res.status(200).json({ data: endpoints });
}

export async function getEndpointHandler(req: Request, res: Response) {
  const clientId = getClientId(req);

  const idParsed = uuidParamSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    return res.status(400).json({ error: "Invalid endpoint ID format" });
  }

  const endpoint = await endpointsService.getEndpointById(clientId, idParsed.data);
  if (!endpoint) {
    return res.status(404).json({ error: "Endpoint not found" });
  }

  return res.status(200).json({ data: endpoint });
}

export async function updateEndpointHandler(req: Request, res: Response) {
  const clientId = getClientId(req);

  const idParsed = uuidParamSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    return res.status(400).json({ error: "Invalid endpoint ID format" });
  }

  const bodyParsed = updateEndpointSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    const flattened = z.flattenError(bodyParsed.error);
    return res.status(400).json({
      error: "Validation failed",
      details: flattened.fieldErrors,
      formErrors: flattened.formErrors,
    });
  }

  const updated = await endpointsService.updateEndpoint(
    clientId,
    idParsed.data,
    bodyParsed.data
  );

  if (!updated) {
    return res.status(404).json({ error: "Endpoint not found" });
  }

  return res.status(200).json({ data: updated });
}

export async function deleteEndpointHandler(req: Request, res: Response) {
  const clientId = getClientId(req);

  const idParsed = uuidParamSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    return res.status(400).json({ error: "Invalid endpoint ID format" });
  }

  const deleted = await endpointsService.deleteEndpoint(clientId, idParsed.data);
  if (!deleted) {
    return res.status(404).json({ error: "Endpoint not found" });
  }

  return res.status(200).json({
    message: "Endpoint deleted successfully",
    data: deleted,
  });
}
