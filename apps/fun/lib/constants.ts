export const PROGRAM_IDS = {
  tokenLaunch:         "5vy9vYy9A6wAy59nRvvpGd5drVwQU1JYqRuSg7xQZDD8",
  graduationDetector:  "UkSurzWXkysn6j3jGcYxKT5zzox4riJoeuPBieod5jS",
  lpVault:             "GkafhSz23DhkebGnL3BKh2mJgFTXXLmE7PJ3rUQAwytm",
  harvester:           "9x7bSPdNCBFxWgFffXzfiCK8fYHDbdsQpBayLGDVo1nP",
  distribution:        "GLkNLk84MXxDpf2xJyVuzrMn2GFMYdiQUF52AEaD3FtM",
  shareholderPool:     "GwhZojK6XRwjC8DiMHx6sR7Tj87wtBtkJFRdXtLCskAK",
  jackpotPool:         "AD2RXz29wS3kb6PPhh7RE5ndMVxc3EFK233NYYQyeedB",
  casinoGrrVault:      "GXkCZuEZ8hScm1YnQqdYMe9SBf2MUgezkzBjny1bUAnU",
  legalReserve:        "8QS218wn9JAVTcc3F8Ged4RFdnbsyRY22rJqy6Km2Xb2",
} as const;

export const GRADUATION_TARGET_USD = 100_000;
export const STARTING_MCAP_USD     = 5_000;
export const TOTAL_SUPPLY          = 1_000_000_000;
export const MAX_WALLET_PCT        = 5;
export const RTP_PCT               = 96;
export const HOUSE_EDGE_PCT        = 4;

export const SLOT_MODELS = [
  { id: "Classic3Reel", label: "Classic 3-Reel", emoji: "🎰", reels: 3 },
  { id: "Standard5Reel",     label: "Standard 5-Reel",        emoji: "🎲", reels: 5 },
  { id: "FiveReelFreeSpins", label: "5-Reel + Free Spins",    emoji: "✨", reels: 5 },
] as const;
