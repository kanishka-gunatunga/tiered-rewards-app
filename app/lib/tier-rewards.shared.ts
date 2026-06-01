export const MAX_TIERS = 10;

export type RewardTier = {
  minSpend: number;
  discountAmount: number;
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
    },
    {
      minSpend: 400_100,
      discountAmount: 40_000,
    },
  ],
};

export const EMPTY_TIER_ROW: RewardTierFormRow = {
  minSpendDollars: "",
  discountDollars: "",
};
