import "dotenv/config";
import {deliveryWorker} from "./workers/delivery.worker";



console.log(`Delivery worker started (queue: ${deliveryWorker.name})`);
