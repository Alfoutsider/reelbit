// Helius Enhanced Transaction webhook payload (relevant subset)
export interface HeliusWebhookPayload {
  accountData: AccountData[];
  description: string;
  events: {
    nft?: unknown;
    swap?: unknown;
  };
  fee: number;
  feePayer: string;
  instructions: Instruction[];
  nativeTransfers: NativeTransfer[];
  signature: string;
  slot: number;
  source: string;
  timestamp: number;
  tokenTransfers: TokenTransfer[];
  transactionError: string | null;
  type: string;
}

export interface AccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: TokenBalanceChange[];
}

export interface TokenBalanceChange {
  mint: string;
  rawTokenAmount: { decimals: number; tokenAmount: string };
  tokenAccount: string;
  userAccount: string;
}

export interface Instruction {
  accounts: string[];
  data: string;
  innerInstructions: Instruction[];
  programId: string;
}

export interface NativeTransfer {
  amount: number;
  fromUserAccount: string;
  toUserAccount: string;
}

export interface TokenTransfer {
  fromTokenAccount: string;
  fromUserAccount: string;
  mint: string;
  toTokenAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  tokenStandard: string;
}

// Internal event types emitted from our programs (discriminators decoded off-chain)
export interface SlotGraduatedEvent {
  mint: string;
  creator: string;
  realSol: bigint;
}

export interface TokensBoughtEvent {
  mint: string;
  buyer: string;
  solIn: bigint;
  tokensOut: bigint;
  realSol: bigint;
  realTokens: bigint;
}
