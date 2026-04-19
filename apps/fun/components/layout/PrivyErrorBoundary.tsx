"use client";

import React from "react";

interface Props { children: React.ReactNode; fallback: React.ReactNode }
interface State { errored: boolean }

export class PrivyErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { errored: false };
  }

  static getDerivedStateFromError() {
    return { errored: true };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Privy] Provider failed to initialize:", error.message);
      console.warn("Check NEXT_PUBLIC_PRIVY_APP_ID in your Vercel env vars.");
    }
  }

  render() {
    if (this.state.errored) return this.props.fallback;
    return this.props.children;
  }
}
