"use client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function fetchBalance(wallet: string): Promise<number> {
  const res = await fetch(`${API}/balance/${wallet}`);
  if (!res.ok) return 0;
  const data = await res.json();
  return data.balance ?? 0;
}

export async function confirmDeposit(
  txSignature: string,
  wallet: string,
): Promise<{ balance: number; deposited: number }> {
  const res = await fetch(`${API}/deposit/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txSignature, wallet }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Deposit failed");
  return data;
}

export async function requestWithdraw(
  wallet: string,
  lamports: number,
  destination?: string,
): Promise<{ txSignature: string; balance: number }> {
  const res = await fetch(`${API}/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, lamports, destination: destination ?? wallet }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Withdrawal failed");
  return data;
}

export async function requestTransfer(
  from: string,
  toUserId: string,
  lamports: number,
): Promise<{ balance: number; recipient: { userId: string; username: string } }> {
  const res = await fetch(`${API}/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, toUserId, lamports }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Transfer failed");
  return data;
}

export async function fetchHouseWallet(): Promise<string> {
  const res = await fetch(`${API}/house-wallet`);
  if (!res.ok) return "";
  const data = await res.json();
  return data.address ?? "";
}
