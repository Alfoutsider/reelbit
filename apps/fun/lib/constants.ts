export const PROGRAM_IDS = {
  tokenLaunch:         "HkGiTLpuij4w7ZM87ooYYn3JPy9neEaxZPwpJKU2imzu",
  graduationDetector:  "HjrWDt8x46beDUP33NCzHc4VdswYKEE2axf6F2CoDxha",
  lpVault:             "5Vobh8rxWv4eMKUme9Y15C3ta3vh6y1G7MW6N87SejwL",
  harvester:           "612nmeDQ6xCRBYoML5hXog1GuYDik4JYAvW8Tihvcpj3",
  distribution:        "58JoCZYPdLiixapnsYM6xXYB7Me8M6TKGXsqCewEto8v",
  shareholderPool:     "2aWNKw6Y3yTyxf1A64BvJBd3K3UJSqwymg8ncTbsirNm",
  jackpotPool:         "CnsFM3xfkWZdv79kERxGfJmty9NRS9jiFEV6tMTnR9gH",
  casinoGrrVault:      "C6yDo6weWztw38hBxqcfR53vwwz1qmc6xNXRyDC3HE8T",
  legalReserve:        "CBtsCTSz8Ug43aPfbVCG2XJsjPzr3p6wTGu5qyVnyVc1",
} as const;

export const GRADUATION_TARGET_USD = 100_000;
export const STARTING_MCAP_USD     = 5_000;
export const TOTAL_SUPPLY          = 1_000_000_000;
export const MAX_WALLET_PCT        = 5;
export const RTP_PCT               = 96;
export const HOUSE_EDGE_PCT        = 4;

export const SLOT_MODELS = [
  { id: "Classic3Reel",      label: "Classic 3-Reel",         emoji: "🎰" },
  { id: "Standard5Reel",     label: "Standard 5-Reel",        emoji: "🎲" },
  { id: "FiveReelFreeSpins", label: "5-Reel + Free Spins",    emoji: "✨" },
] as const;
