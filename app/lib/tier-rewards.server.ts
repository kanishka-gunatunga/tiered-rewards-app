import type { authenticate } from "../shopify.server"; // type-only

import {
  DEFAULT_TIER_REWARDS_CONFIG,
  MAX_TIERS,
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
export const TIER_REWARDS_CONFIG_HANDLE = "default";

const METAOBJECT_BY_HANDLE_QUERY = `#graphql
  query TierRewardsConfigByHandle($handle: MetaobjectHandleInput!) {
    metaobjectByHandle(handle: $handle) {
      id
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
      tiers: field(key: "tiers") {
        jsonValue
      }
    }
  }
`;

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
    messageFar: tier.messageFar,
    messageClose: tier.messageClose,
    messageUnlocked: tier.messageUnlocked,
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
      !Number.isFinite(discountAmount) ||
      typeof r.messageFar !== "string" ||
      typeof r.messageClose !== "string" ||
      typeof r.messageUnlocked !== "string"
    ) {
      continue;
    }
    tiers.push({
      minSpend,
      discountAmount,
      messageFar: r.messageFar,
      messageClose: r.messageClose,
      messageUnlocked: r.messageUnlocked,
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
  const response = await admin.graphql(METAOBJECT_BY_HANDLE_QUERY, {
    variables: {
      handle: {
        type: TIER_REWARDS_METAOBJECT_TYPE,
        handle: TIER_REWARDS_CONFIG_HANDLE,
      },
    },
  });
  const json = (await response.json()) as {
    data?: {
      metaobjectByHandle?: {
        title?: { value?: string | null };
        enabled?: { value?: string | null };
        programTitle?: { value?: string | null };
        homepageSubtitle?: { value?: string | null };
        tiers?: { jsonValue?: unknown };
      } | null;
    };
    errors?: { message: string }[];
  };

  if (json.errors?.length) {
    console.error(
      "[tier-rewards] metaobjectByHandle failed:",
      JSON.stringify(json.errors),
    );
    return { ...DEFAULT_TIER_REWARDS_CONFIG };
  }

  const node = json.data?.metaobjectByHandle;

  if (!node) {
    return { ...DEFAULT_TIER_REWARDS_CONFIG };
  }

  const tiers = parseTiersJson(node.tiers?.jsonValue);

  return {
    title: node.title?.value || DEFAULT_TIER_REWARDS_CONFIG.title,
    enabled: parseBooleanField(node.enabled?.value),
    programTitle:
      node.programTitle?.value || DEFAULT_TIER_REWARDS_CONFIG.programTitle,
    homepageSubtitle:
      node.homepageSubtitle?.value ||
      DEFAULT_TIER_REWARDS_CONFIG.homepageSubtitle,
    tiers: tiers.length > 0 ? tiers : DEFAULT_TIER_REWARDS_CONFIG.tiers,
  };
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

  let previousMinSpend = -1;
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
    previousMinSpend = tier.minSpend;

    if (!tier.messageFar.trim() || !tier.messageClose.trim()) {
      errors.push(`${label}: far and close messages are required.`);
    }
    if (!tier.messageUnlocked.trim()) {
      errors.push(`${label}: unlocked message is required.`);
    }
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
      messageFar: String(row.messageFar ?? "").trim(),
      messageClose: String(row.messageClose ?? "").trim(),
      messageUnlocked: String(row.messageUnlocked ?? "").trim(),
    });
  }

  return tiers;
}

export function parseConfigFromFormData(formData: FormData): TierRewardsConfig {
  return {
    title: String(formData.get("title") ?? "").trim() || "Default rewards",
    enabled: formData.get("enabled") === "on",
    programTitle: String(formData.get("programTitle") ?? "").trim(),
    homepageSubtitle: String(formData.get("homepageSubtitle") ?? "").trim(),
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

  const response = await admin.graphql(METAOBJECT_UPSERT_MUTATION, {
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
          { key: "tiers", value: JSON.stringify(config.tiers) },
        ],
      },
    },
  });

  const json = await response.json();
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
