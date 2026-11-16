import express from "express";
import endpointsRouter from "./modules/endpoints/endpoints.routes";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => { 
    res.status(200).json({
        status: "ok",
        service: "Relay"
    });
});

app.use("/api/v1/endpoints", endpointsRouter);

export default app;