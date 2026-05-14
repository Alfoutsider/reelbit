import Stripe from "stripe";
import { config } from "./config";

export const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: "2025-04-30.basil",
});
