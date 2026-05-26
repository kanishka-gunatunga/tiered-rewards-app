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

function parseFunctionConfig(input: CartInput): FunctionConfig | null {
  const jsonValue = input.discount.metafield?.jsonValue;
  if (!jsonValue || typeof jsonValue !== 'object' || Array.isArray(jsonValue)) {
    return null;
  }

  const record = jsonValue as Record<string, unknown>;
  if (!Array.isArray(record.tiers)) {
    return null;
  }

  const tiers: TierRow[] = [];
  for (const row of record.tiers) {
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

  return {
    enabled: record.enabled !== false,
    tiers,
  };
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

  const subtotalCents = parseMoneyToCents(input.cart.cost.subtotalAmount.amount);
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
              message: `$${discountDollars} tier reward unlocked`,
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
