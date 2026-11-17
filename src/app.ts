import express from "express";
import endpointsRouter from "./modules/endpoints/endpoints.routes";
import { eventsRouter } from "./modules/events/events.routes";

const app = express();

app.use(express.json({limit: "128kb"}));

app.get("/health", (req, res) => { 
    res.status(200).json({
        status: "ok",
        service: "Relay"
    });
});

app.use("/api/v1/endpoints", endpointsRouter);
app.use("/api/v1/events", eventsRouter);

export default app;