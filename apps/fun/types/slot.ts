export type SlotModel = "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";

export interface SlotToken {
  mint: string;
  name: string;
  ticker: string;
  imageUri: string;
  model: SlotModel;
  creator: string;
  graduated: boolean;
  mcapUsd: number;
  priceUsd: number;
  volume24h: number;
  createdAt: number;
}

export interface TradeEvent {
  txSig: string;
  type: "buy" | "sell";
  wallet: string;
  solAmount: number;
  tokenAmount: number;
  priceUsd: number;
  timestamp: number;
}

export interface CurvePoint {
  supplyPct: number;
  priceUsd: number;
}
