"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createStripeIntent } from "@/lib/balanceClient";

const stripePromise = typeof window !== "undefined" && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function InnerForm({
  amountUsd,
  onSuccess,
}: {
  amountUsd: number;
  onSuccess: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setErr("");
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      setErr(error.message ?? "Payment failed — please try again");
      setLoading(false);
    } else {
      // Payment succeeded — give the webhook a moment to credit the balance
      await new Promise((r) => setTimeout(r, 2_000));
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <button
        type="submit"
        disabled={loading || !stripe}
        className="btn-launch w-full py-3 text-sm disabled:opacity-50"
      >
        {loading ? "Processing…" : `Pay $${amountUsd.toFixed(2)}`}
      </button>
      <p className="text-white/20 text-[10px] text-center">
        Secured by Stripe. Card details never touch our servers.
      </p>
    </form>
  );
}

interface Props {
  amountUsd: number;
  wallet: string;
  onSuccess: () => void;
}

export function StripeCardForm({ amountUsd, wallet, onSuccess }: Props) {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading]           = useState(true);
  const [err, setErr]                   = useState("");

  useEffect(() => {
    if (!amountUsd || amountUsd < 10) return;
    setLoading(true);
    setErr("");
    setClientSecret("");
    createStripeIntent(wallet, amountUsd)
      .then((d) => setClientSecret(d.clientSecret))
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [amountUsd, wallet]);

  if (!stripePromise) {
    return (
      <p className="text-white/40 text-sm text-center">
        Card payments are not configured yet.
      </p>
    );
  }

  if (loading) {
    return <p className="text-white/40 text-sm text-center animate-pulse">Preparing payment…</p>;
  }

  if (err) {
    return <p className="text-red-400 text-sm">{err}</p>;
  }

  if (!clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#9333ea",
            colorBackground: "#0a0a18",
            colorText: "#ffffff",
            borderRadius: "12px",
            fontFamily: "inherit",
          },
        },
      }}
    >
      <InnerForm amountUsd={amountUsd} onSuccess={onSuccess} />
    </Elements>
  );
}
