import Stripe from "stripe";
import { config } from "./config";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!config.stripeSecretKey) throw new Error("STRIPE_SECRET_KEY not configured");
    _stripe = new Stripe(config.stripeSecretKey, { apiVersion: "2026-04-22.dahlia" });
  }
  return _stripe;
}
