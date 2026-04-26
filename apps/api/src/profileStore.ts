import { supabase } from "./supabase";

export interface UserProfile {
  userId:    string;
  wallet:    string;
  username:  string;
  pfpUrl:    string | null;
  pfpType:   "upload" | "nft" | null;
  nftMint:   string | null;
  createdAt: number;
}

function generateUserId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProfile(row: any): UserProfile {
  return {
    userId:    row.user_id,
    wallet:    row.wallet,
    username:  row.username,
    pfpUrl:    row.pfp_url   ?? null,
    pfpType:   row.pfp_type  ?? null,
    nftMint:   row.nft_mint  ?? null,
    createdAt: row.created_at,
  };
}

export async function getProfile(wallet: string): Promise<UserProfile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("wallet", wallet).maybeSingle();
  return data ? toProfile(data) : null;
}

export async function getProfileByUserId(userId: string): Promise<UserProfile | null> {
  const clean = userId.replace(/^#/, "").toUpperCase();
  const { data } = await supabase.from("profiles").select("*").eq("user_id", clean).maybeSingle();
  return data ? toProfile(data) : null;
}

export async function createProfile(wallet: string, username: string): Promise<UserProfile> {
  const existing = await getProfile(wallet);
  if (existing) return existing;

  let userId: string;
  let taken = true;
  do {
    userId = generateUserId();
    const { data } = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
    taken = !!data;
  } while (taken);

  const row = {
    wallet,
    user_id:    userId,
    username,
    pfp_url:    null,
    pfp_type:   null,
    nft_mint:   null,
    created_at: Date.now(),
  };

  const { data, error } = await supabase.from("profiles").insert(row).select().single();
  if (error) throw new Error(error.message);
  return toProfile(data);
}

export async function updateProfile(
  wallet: string,
  updates: Partial<Pick<UserProfile, "username" | "pfpUrl" | "pfpType" | "nftMint">>,
): Promise<UserProfile> {
  const row: Record<string, unknown> = {};
  if (updates.username !== undefined) row.username = updates.username;
  if (updates.pfpUrl   !== undefined) row.pfp_url  = updates.pfpUrl;
  if (updates.pfpType  !== undefined) row.pfp_type = updates.pfpType;
  if (updates.nftMint  !== undefined) row.nft_mint = updates.nftMint;

  const { data, error } = await supabase.from("profiles").update(row).eq("wallet", wallet).select().single();
  if (error) throw new Error(error.message);
  return toProfile(data);
}

export async function savePfpFile(wallet: string, base64Data: string, ext: string): Promise<string> {
  const safeExt  = ["jpg","jpeg","png","gif","webp"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
  const filename  = `${wallet.slice(0, 16)}_${Date.now()}.${safeExt}`;
  const buffer    = Buffer.from(base64Data, "base64");
  const mime      = safeExt === "jpg" ? "image/jpeg" : `image/${safeExt}`;

  const { error } = await supabase.storage.from("pfp").upload(filename, buffer, { contentType: mime, upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("pfp").getPublicUrl(filename);
  return data.publicUrl;
}
