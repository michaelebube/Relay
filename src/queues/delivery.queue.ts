import {Queue} from "bullmq";
import {queueRedisConnection} from "../config/redis";

export interface DeliveryJobData {
    deliveryId: string;
}

export const DELIVERY_QUEUE_NAME = "delivery";

export const deliveryQueue = new Queue<DeliveryJobData>(DELIVERY_QUEUE_NAME, {
    connection: queueRedisConnection,
});