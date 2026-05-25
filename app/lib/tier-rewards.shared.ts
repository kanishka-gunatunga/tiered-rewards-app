export const MAX_TIERS = 10;

export type RewardTier = {
  minSpend: number;
  discountAmount: number;
  messageFar: string;
  messageClose: string;
  messageUnlocked: string;
};

export type TierRewardsConfig = {
  title: string;
  enabled: boolean;
  programTitle: string;
  homepageSubtitle: string;
  tiers: RewardTier[];
};

export type RewardTierFormRow = {
  minSpendDollars: string;
  discountDollars: string;
  messageFar: string;
  messageClose: string;
  messageUnlocked: string;
};

export const DEFAULT_TIER_REWARDS_CONFIG: TierRewardsConfig = {
  title: "Default rewards",
  enabled: true,
  programTitle: "Instant Rewards",
  homepageSubtitle:
    "Spend more on this order to unlock bigger discounts",
  tiers: [
    {
      minSpend: 300_100,
      discountAmount: 30_000,
      messageFar:
        "A Black Friday reward is waiting… spend $3,001 to unlock it.",
      messageClose:
        "You're nearly there! Spend {amount_remaining} more to unlock your $300 instant reward.",
      messageUnlocked:
        "Congratulations! You've unlocked your $300 instant reward. Spend {amount_remaining} more to upgrade to the next tier.",
    },
    {
      minSpend: 400_100,
      discountAmount: 40_000,
      messageFar:
        "Spend {amount_remaining} more to unlock your $400 bonus tier.",
      messageClose:
        "Almost there! Spend {amount_remaining} more for your $400 instant reward.",
      messageUnlocked:
        "You've unlocked your $400 instant reward. Spend {amount_remaining} more for the maximum tier.",
    },
  ],
};

export const EMPTY_TIER_ROW: RewardTierFormRow = {
  minSpendDollars: "",
  discountDollars: "",
  messageFar: "",
  messageClose: "",
  messageUnlocked: "",
};
