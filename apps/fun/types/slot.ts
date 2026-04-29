export type SlotModel = "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";

export type CreatorStatus = "full" | "penalized" | "dumped";

export interface SlotToken {
  mint: string;
  name: string;
  ticker: string;
  imageUri: string;
  model: SlotModel;
  creator: string;
  graduated: boolean;
  devBuyPct: number;
  mcapUsd: number;
  priceUsd: number;
  volume24h: number;
  createdAt: number;
  creatorStatus?: CreatorStatus;
  creatorRevPct?: number;
}

export interface TradeEvent {
  txSig:       string;
  mint?:       string;
  type:        "buy" | "sell";
  wallet:      string;
  solAmount:   number;
  tokenAmount: number;
  usdValue:    number;
  timestamp:   number;
}

export interface CurvePoint {
  supplyPct: number;
  priceUsd: number;
}
