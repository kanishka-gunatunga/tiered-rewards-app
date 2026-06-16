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
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
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
  primaryColor: "#bb4d00",
  secondaryColor: "#e17100",
  backgroundColor: "#fffaf3",
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

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export function normalizeHexColor(
  value: string | null | undefined,
  fallback: string,
): string {
  const raw = String(value ?? "").trim();
  if (!HEX_COLOR_PATTERN.test(raw)) {
    return fallback;
  }

  if (raw.length === 4) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return raw.toLowerCase();
}
