import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from '../generated/api';

type TierRow = {
  minSpend: number;
  discountAmount: number;
};

type FunctionConfig = {
  enabled: boolean;
  tiers: TierRow[];
};

function parseMoneyToCents(amount: string | number): number {
  const value = typeof amount === 'number' ? amount : Number.parseFloat(amount);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

function centsToDecimalAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseTierRows(rawTiers: unknown): TierRow[] {
  if (!Array.isArray(rawTiers)) return [];

  const tiers: TierRow[] = [];
  for (const row of rawTiers) {
    if (!row || typeof row !== 'object') continue;
    const tier = row as Record<string, unknown>;
    const minSpend = Number(tier.minSpend);
    const discountAmount = Number(tier.discountAmount);
    if (
      !Number.isFinite(minSpend) ||
      !Number.isFinite(discountAmount) ||
      minSpend <= 0 ||
      discountAmount <= 0
    ) {
      continue;
    }
    tiers.push({minSpend, discountAmount});
  }

  tiers.sort((a, b) => a.minSpend - b.minSpend);
  return tiers;
}

/** Legacy configs stored dollar amounts (e.g. 3001) instead of cents (300100). */
function normalizeTiersToCents(tiers: TierRow[]): TierRow[] {
  if (tiers.length === 0) return tiers;

  const looksLikeDollars = tiers.every(
    (tier) => tier.minSpend < 10_000 && tier.discountAmount < 10_000,
  );

  if (!looksLikeDollars) return tiers;

  return tiers.map((tier) => ({
    minSpend: Math.round(tier.minSpend * 100),
    discountAmount: Math.round(tier.discountAmount * 100),
  }));
}

function parseRecordConfig(record: Record<string, unknown>): FunctionConfig | null {
  if (!Array.isArray(record.tiers)) return null;

  const tiers = normalizeTiersToCents(parseTierRows(record.tiers));
  if (tiers.length === 0) return null;

  return {
    enabled: record.enabled !== false,
    tiers,
  };
}

function parseDiscountMetafieldConfig(input: CartInput): FunctionConfig | null {
  const jsonValue = input.discount.metafield?.jsonValue;
  if (!jsonValue || typeof jsonValue !== 'object' || Array.isArray(jsonValue)) {
    return null;
  }

  return parseRecordConfig(jsonValue as Record<string, unknown>);
}

function parseFunctionConfig(input: CartInput): FunctionConfig | null {
  // Prefer the discount metafield synced on Save — it is not affected by
  // Shopify's orphaned metaobject-handle bug after uninstall/reinstall.
  return parseDiscountMetafieldConfig(input);
}

function getCartSubtotalCents(input: CartInput): number {
  let fromLines = 0;
  for (const line of input.cart.lines) {
    fromLines += parseMoneyToCents(line.cost.subtotalAmount.amount);
  }

  if (fromLines > 0) return fromLines;

  return parseMoneyToCents(input.cart.cost.subtotalAmount.amount);
}

function findBestTier(tiers: TierRow[], subtotalCents: number): TierRow | null {
  let best: TierRow | null = null;
  for (const tier of tiers) {
    if (subtotalCents >= tier.minSpend) {
      best = tier;
    }
  }
  return best;
}

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  if (!input.cart.lines.length) {
    return {operations: []};
  }

  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );

  if (!hasOrderDiscountClass) {
    return {operations: []};
  }

  const functionConfig = parseFunctionConfig(input);
  if (!functionConfig?.enabled || functionConfig.tiers.length === 0) {
    return {operations: []};
  }

  const subtotalCents = getCartSubtotalCents(input);
  const bestTier = findBestTier(functionConfig.tiers, subtotalCents);

  if (!bestTier) {
    return {operations: []};
  }

  const discountDollars = centsToDecimalAmount(bestTier.discountAmount);

  return {
    operations: [
      {
        orderDiscountsAdd: {
          candidates: [
            {
              message: `Tier reward unlocked`,
              targets: [
                {
                  orderSubtotal: {
                    excludedCartLineIds: [],
                  },
                },
              ],
              value: {
                fixedAmount: {
                  amount: discountDollars,
                },
              },
            },
          ],
          selectionStrategy: OrderDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}