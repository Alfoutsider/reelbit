"use client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface UserProfile {
  userId:    string;
  wallet:    string;
  username:  string;
  pfpUrl:    string | null;
  pfpType:   "upload" | "nft" | null;
  nftMint:   string | null;
  createdAt: number;
}

export async function fetchProfile(wallet: string): Promise<UserProfile | null> {
  const res = await fetch(`${API}/profile/${wallet}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function createProfile(wallet: string, username: string): Promise<UserProfile> {
  const res = await fetch(`${API}/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, username }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create profile");
  return data;
}

export async function updateUsername(wallet: string, username: string): Promise<UserProfile> {
  const res = await fetch(`${API}/profile/${wallet}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update username");
  return data;
}

export async function uploadPfp(wallet: string, file: File): Promise<UserProfile> {
  const base64 = await fileToBase64(file);
  const ext = file.name.split(".").pop() ?? "jpg";
  const res = await fetch(`${API}/profile/${wallet}/pfp/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, ext }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to upload pfp");
  return data;
}

export async function setNftPfp(wallet: string, mint: string): Promise<UserProfile> {
  const res = await fetch(`${API}/profile/${wallet}/pfp/nft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mint }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to set NFT pfp");
  return data;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix (data:image/jpeg;base64,...)
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
