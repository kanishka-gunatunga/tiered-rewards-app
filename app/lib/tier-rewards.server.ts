import type { authenticate } from "../shopify.server"; // type-only

import {
  DEFAULT_TIER_REWARDS_CONFIG,
  MAX_TIERS,
  normalizeHexColor,
  type RewardTier,
  type RewardTierFormRow,
  type TierRewardsConfig,
} from "./tier-rewards.shared";

export {
  DEFAULT_TIER_REWARDS_CONFIG,
  MAX_TIERS,
  type RewardTier,
  type RewardTierFormRow,
  type TierRewardsConfig,
} from "./tier-rewards.shared";

type AdminGraphQLClient = Awaited<
  ReturnType<typeof authenticate.admin>
>["admin"];

export const TIER_REWARDS_METAOBJECT_TYPE = "$app:tier_rewards_config";
/** Avoid handle "default" — orphaned entries from reinstall can block metaobjectUpsert. */
export const TIER_REWARDS_CONFIG_HANDLE = "active";

const METAOBJECT_CONFIG_FIELDS = `
  id
  handle
  title: field(key: "title") {
    value
  }
  enabled: field(key: "enabled") {
    value
  }
  programTitle: field(key: "program_title") {
    value
  }
  homepageSubtitle: field(key: "homepage_subtitle") {
    value
  }
  primaryColor: field(key: "primary_color") {
    value
  }
  secondaryColor: field(key: "secondary_color") {
    value
  }
  backgroundColor: field(key: "background_color") {
    value
  }
  tiers: field(key: "tiers") {
    jsonValue
  }
`;

const METAOBJECTS_QUERY = `#graphql
  query TierRewardsConfigEntries {
    metaobjects(type: "${TIER_REWARDS_METAOBJECT_TYPE}", first: 10) {
      nodes {
        ${METAOBJECT_CONFIG_FIELDS}
      }
    }
  }
`;

type TierRewardsMetaobjectNode = {
  handle?: string | null;
  title?: { value?: string | null };
  enabled?: { value?: string | null };
  programTitle?: { value?: string | null };
  homepageSubtitle?: { value?: string | null };
  primaryColor?: { value?: string | null };
  secondaryColor?: { value?: string | null };
  backgroundColor?: { value?: string | null };
  tiers?: { jsonValue?: unknown };
};

function pickTierRewardsMetaobjectNode(
  nodes: TierRewardsMetaobjectNode[],
): TierRewardsMetaobjectNode | null {
  if (nodes.length === 0) return null;

  return (
    nodes.find((node) => node.handle === TIER_REWARDS_CONFIG_HANDLE) ?? nodes[0]
  );
}

function metaobjectNodeToConfig(
  node: TierRewardsMetaobjectNode,
): TierRewardsConfig {
  const tiers = parseTiersJson(node.tiers?.jsonValue);

  return {
    title: node.title?.value || DEFAULT_TIER_REWARDS_CONFIG.title,
    enabled: parseBooleanField(node.enabled?.value),
    programTitle:
      node.programTitle?.value || DEFAULT_TIER_REWARDS_CONFIG.programTitle,
    homepageSubtitle:
      node.homepageSubtitle?.value ||
      DEFAULT_TIER_REWARDS_CONFIG.homepageSubtitle,
    primaryColor: normalizeHexColor(
      node.primaryColor?.value,
      DEFAULT_TIER_REWARDS_CONFIG.primaryColor,
    ),
    secondaryColor: normalizeHexColor(
      node.secondaryColor?.value,
      DEFAULT_TIER_REWARDS_CONFIG.secondaryColor,
    ),
    backgroundColor: normalizeHexColor(
      node.backgroundColor?.value,
      DEFAULT_TIER_REWARDS_CONFIG.backgroundColor,
    ),
    tiers: tiers.length > 0 ? tiers : DEFAULT_TIER_REWARDS_CONFIG.tiers,
  };
}

const METAOBJECT_UPSERT_MUTATION = `#graphql
  mutation TierRewardsConfigUpsert(
    $handle: MetaobjectHandleInput!
    $metaobject: MetaobjectUpsertInput!
  ) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export function centsToDollarString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parseDollarStringToCents(value: string): number | null {
  const trimmed = value.trim().replace(/[$,]/g, "");
  if (!trimmed) return null;
  const amount = Number.parseFloat(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function configToFormRows(config: TierRewardsConfig): RewardTierFormRow[] {
  return config.tiers.map((tier) => ({
    minSpendDollars: centsToDollarString(tier.minSpend),
    discountDollars: centsToDollarString(tier.discountAmount),
  }));
}

function parseTiersJson(value: unknown): RewardTier[] {
  if (!Array.isArray(value)) return [];
  const tiers: RewardTier[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const minSpend = Number(r.minSpend);
    const discountAmount = Number(r.discountAmount);
    if (
      !Number.isFinite(minSpend) ||
      !Number.isFinite(discountAmount)
    ) {
      continue;
    }
    tiers.push({
      minSpend,
      discountAmount,
    });
  }
  return tiers;
}

function parseBooleanField(value: string | null | undefined): boolean {
  return value === "true" || value === "1";
}

export async function loadTierRewardsConfig(
  admin: AdminGraphQLClient,
): Promise<TierRewardsConfig> {
  const response = await admin.graphql(METAOBJECTS_QUERY);
  const json = (await response.json()) as {
    data?: {
      metaobjects?: {
        nodes?: TierRewardsMetaobjectNode[];
      };
    };
    errors?: { message: string }[];
  };

  if (json.errors?.length) {
    console.error(
      "[tier-rewards] metaobjects query failed:",
      JSON.stringify(json.errors),
    );
    return { ...DEFAULT_TIER_REWARDS_CONFIG };
  }

  const node = pickTierRewardsMetaobjectNode(
    json.data?.metaobjects?.nodes ?? [],
  );

  if (!node) {
    return { ...DEFAULT_TIER_REWARDS_CONFIG };
  }

  return metaobjectNodeToConfig(node);
}

export function validateTierRewardsConfig(
  config: TierRewardsConfig,
): string[] {
  const errors: string[] = [];

  if (!config.title.trim()) {
    errors.push("Title is required.");
  }

  if (config.tiers.length > MAX_TIERS) {
    errors.push(`You can configure at most ${MAX_TIERS} tiers.`);
  }

  const minSpendSeen = new Map<number, number>();
  const discountSeen = new Map<number, number>();
  let previousMinSpend = -1;
  let previousDiscountAmount = -1;

  for (let i = 0; i < config.tiers.length; i++) {
    const tier = config.tiers[i];
    const label = `Tier ${i + 1}`;

    if (tier.minSpend <= 0) {
      errors.push(`${label}: minimum spend must be greater than $0.`);
    }
    if (tier.discountAmount <= 0) {
      errors.push(`${label}: discount amount must be greater than $0.`);
    }
    if (tier.minSpend <= previousMinSpend) {
      errors.push(
        `${label}: minimum spend must be higher than the previous tier.`,
      );
    }
    if (tier.discountAmount <= previousDiscountAmount) {
      errors.push(
        `${label}: discount must be greater than the previous tier's discount.`,
      );
    }
    if (tier.discountAmount >= tier.minSpend) {
      errors.push(
        `${label}: discount ($${centsToDollarString(tier.discountAmount)}) must be less than the minimum spend ($${centsToDollarString(tier.minSpend)}).`,
      );
    }

    const duplicateMinSpendTier = minSpendSeen.get(tier.minSpend);
    if (duplicateMinSpendTier !== undefined) {
      errors.push(
        `${label}: minimum spend ($${centsToDollarString(tier.minSpend)}) is already used by tier ${duplicateMinSpendTier + 1}.`,
      );
    } else {
      minSpendSeen.set(tier.minSpend, i);
    }

    const duplicateDiscountTier = discountSeen.get(tier.discountAmount);
    if (duplicateDiscountTier !== undefined) {
      errors.push(
        `${label}: discount ($${centsToDollarString(tier.discountAmount)}) is already used by tier ${duplicateDiscountTier + 1}. Each tier needs a unique reward amount.`,
      );
    } else {
      discountSeen.set(tier.discountAmount, i);
    }

    previousMinSpend = tier.minSpend;
    previousDiscountAmount = tier.discountAmount;
  }

  if (config.enabled && config.tiers.length === 0) {
    errors.push("Add at least one tier when the program is enabled.");
  }

  return errors;
}

export function parseTierRowsFromFormData(formData: FormData): RewardTier[] {
  const raw = formData.get("tiersJson");
  if (typeof raw !== "string" || !raw.trim()) return [];

  let rows: RewardTierFormRow[];
  try {
    rows = JSON.parse(raw) as RewardTierFormRow[];
  } catch {
    return [];
  }

  if (!Array.isArray(rows)) return [];

  const tiers: RewardTier[] = [];
  for (const row of rows.slice(0, MAX_TIERS)) {
    const minSpend = parseDollarStringToCents(row.minSpendDollars ?? "");
    const discountAmount = parseDollarStringToCents(row.discountDollars ?? "");
    if (minSpend === null || discountAmount === null) continue;

    tiers.push({
      minSpend,
      discountAmount,
    });
  }

  return tiers;
}

export function parseConfigFromFormData(formData: FormData): TierRewardsConfig {
  return {
    title: DEFAULT_TIER_REWARDS_CONFIG.title,
    enabled: formData.get("enabled") === "on",
    programTitle: DEFAULT_TIER_REWARDS_CONFIG.programTitle,
    homepageSubtitle: DEFAULT_TIER_REWARDS_CONFIG.homepageSubtitle,
    primaryColor: DEFAULT_TIER_REWARDS_CONFIG.primaryColor,
    secondaryColor: DEFAULT_TIER_REWARDS_CONFIG.secondaryColor,
    backgroundColor: DEFAULT_TIER_REWARDS_CONFIG.backgroundColor,
    tiers: parseTierRowsFromFormData(formData),
  };
}

export async function saveTierRewardsConfig(
  admin: AdminGraphQLClient,
  config: TierRewardsConfig,
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const validationErrors = validateTierRewardsConfig(config);
  if (validationErrors.length > 0) {
    return { ok: false, errors: validationErrors };
  }

  let response: Response;
  try {
    response = await admin.graphql(METAOBJECT_UPSERT_MUTATION, {
      variables: {
        handle: {
          type: TIER_REWARDS_METAOBJECT_TYPE,
          handle: TIER_REWARDS_CONFIG_HANDLE,
        },
        metaobject: {
          fields: [
            { key: "title", value: config.title },
            { key: "enabled", value: config.enabled ? "true" : "false" },
            { key: "program_title", value: config.programTitle },
            { key: "homepage_subtitle", value: config.homepageSubtitle },
            { key: "primary_color", value: config.primaryColor },
            { key: "secondary_color", value: config.secondaryColor },
            { key: "background_color", value: config.backgroundColor },
            { key: "tiers", value: JSON.stringify(config.tiers) },
          ],
        },
      },
    });
  } catch (error) {
    console.error("[tier-rewards] metaobjectUpsert request failed:", error);
    return {
      ok: false,
      errors: [
        error instanceof Error
          ? error.message
          : "Could not reach Shopify to save settings.",
      ],
    };
  }

  const json = (await response.json()) as {
    data?: {
      metaobjectUpsert?: {
        userErrors?: Array<{ message: string }>;
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    console.error(
      "[tier-rewards] metaobjectUpsert GraphQL errors:",
      JSON.stringify(json.errors),
    );
    return {
      ok: false,
      errors: json.errors.map((e) => e.message || "Save failed."),
    };
  }

  const userErrors = json.data?.metaobjectUpsert?.userErrors ?? [];

  if (userErrors.length > 0) {
    return {
      ok: false,
      errors: userErrors.map(
        (e: { message: string }) => e.message || "Save failed.",
      ),
    };
  }

  return { ok: true };
}
