import { Router } from "express";
import { authenticateMiddleware } from "../../middleware/authenticate";
import {
  createEndpointHandler,
  deleteEndpointHandler,
  getEndpointHandler,
  listEndpointsHandler,
  updateEndpointHandler,
} from "./endpoints.controller";

const router = Router();

router.use(authenticateMiddleware);

router.post("/", createEndpointHandler);
router.get("/", listEndpointsHandler);
router.get("/:id", getEndpointHandler);
router.patch("/:id", updateEndpointHandler);
router.delete("/:id", deleteEndpointHandler);

export default router;
