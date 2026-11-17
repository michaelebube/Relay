import {Router} from "express";
import {authenticateMiddleware} from "../../middleware/authenticate";
import {createEventHandler} from "./events.controller";

const router = Router();

router.post("/", authenticateMiddleware, createEventHandler);

export {router as eventsRouter};