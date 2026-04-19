"use client";

import {
  usePrivy as _usePrivy,
  useWallets as _useWallets,
} from "@privy-io/react-auth";

const STUB = {
  ready: true,
  authenticated: false,
  login: () => {},
  logout: async () => {},
  user: null,
  linkWallet: () => {},
};

export function usePrivy() {
  try {
    return _usePrivy();
  } catch {
    return STUB;
  }
}

export function useWallets() {
  try {
    return _useWallets();
  } catch {
    return { wallets: [] as ReturnType<typeof _useWallets>["wallets"] };
  }
}
