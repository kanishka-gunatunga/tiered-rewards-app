import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  configToFormRows,
  DEFAULT_TIER_REWARDS_CONFIG,
  loadTierRewardsConfig,
  MAX_TIERS,
  parseConfigFromFormData,
  saveTierRewardsConfig,
  type RewardTierFormRow,
} from "../lib/tier-rewards.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.pathname === "/app/tiers" || url.pathname.endsWith("/app/tiers")) {
    throw redirect("/app");
  }

  const { admin } = await authenticate.admin(request);

  try {
    const config = await loadTierRewardsConfig(admin);

    return {
      config,
      formRows: configToFormRows(config),
      loadError: null as string | null,
    };
  } catch (error) {
    console.error("[app.tiers] loader failed:", error);
    const config = { ...DEFAULT_TIER_REWARDS_CONFIG };

    return {
      config,
      formRows: configToFormRows(config),
      loadError:
        error instanceof Error
          ? error.message
          : "Could not load rewards settings. Using defaults.",
    };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const config = parseConfigFromFormData(formData);
  const result = await saveTierRewardsConfig(admin, config);

  if (!result.ok) {
    return {
      ok: false as const,
      errors: result.errors,
      formRows: configToFormRows(config),
      config,
    };
  }

  return { ok: true as const, config, formRows: configToFormRows(config) };
};

const EMPTY_TIER_ROW: RewardTierFormRow = {
  minSpendDollars: "",
  discountDollars: "",
  messageFar: "",
  messageClose: "",
  messageUnlocked: "",
};

export default function TiersPage() {
  const { loadError, ...loaderData } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const isSaving =
    navigation.state === "submitting" && navigation.formMethod === "POST";

  const savedConfig = actionData?.ok ? actionData.config : loaderData.config;
  const formRows =
    actionData && !actionData.ok
      ? actionData.formRows
      : actionData?.ok
        ? actionData.formRows
        : loaderData.formRows;

  const [tiers, setTiers] = useState<RewardTierFormRow[]>(formRows);
  const [title, setTitle] = useState(savedConfig.title);
  const [programTitle, setProgramTitle] = useState(savedConfig.programTitle);
  const [homepageSubtitle, setHomepageSubtitle] = useState(
    savedConfig.homepageSubtitle,
  );
  const [enabled, setEnabled] = useState(savedConfig.enabled);
  const errors = actionData && !actionData.ok ? actionData.errors : [];

  useEffect(() => {
    setTiers(formRows);
    setTitle(savedConfig.title);
    setProgramTitle(savedConfig.programTitle);
    setHomepageSubtitle(savedConfig.homepageSubtitle);
    setEnabled(savedConfig.enabled);
  }, [formRows, savedConfig]);

  useEffect(() => {
    if (actionData?.ok) {
      shopify.toast.show("Rewards settings saved");
    }
  }, [actionData?.ok, shopify]);

  const addTier = () => {
    if (tiers.length >= MAX_TIERS) return;
    setTiers([...tiers, { ...EMPTY_TIER_ROW }]);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (
    index: number,
    field: keyof RewardTierFormRow,
    value: string,
  ) => {
    setTiers(
      tiers.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  return (
    <s-page heading="Rewards tiers">
      <Form method="post">
        <s-stack direction="block" gap="large">
          <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
            <s-button
              type="submit"
              variant="primary"
              {...(isSaving ? { loading: true } : {})}
            >
              Save settings
            </s-button>
          </div>
          {loadError && (
            <s-section heading="Could not load saved settings">
              <s-paragraph>{loadError}</s-paragraph>
              <s-paragraph>
                Showing default values. Save once to create the config in
                Shopify.
              </s-paragraph>
            </s-section>
          )}

          {errors.length > 0 && (
            <s-section heading="Fix these issues">
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
                <s-unordered-list>
                  {errors.map((message) => (
                    <s-list-item key={message}>{message}</s-list-item>
                  ))}
                </s-unordered-list>
              </s-box>
            </s-section>
          )}

          <s-section heading="Program">
          <s-stack direction="block" gap="base">
            <s-checkbox
              name="enabled"
              checked={enabled || undefined}
              onChange={(e) => setEnabled(e.currentTarget.checked)}
              label="Program enabled"
            />
            <s-text-field
              name="title"
              label="Config title (internal)"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              details="Used in Shopify Admin → Content → Metaobjects"
            />
            <s-text-field
              name="programTitle"
              label="Program title (storefront)"
              value={programTitle}
              onChange={(e) => setProgramTitle(e.currentTarget.value)}
              placeholder={DEFAULT_TIER_REWARDS_CONFIG.programTitle}
            />
            <s-text-field
              name="homepageSubtitle"
              label="Homepage subtitle"
              value={homepageSubtitle}
              onChange={(e) => setHomepageSubtitle(e.currentTarget.value)}
              placeholder={DEFAULT_TIER_REWARDS_CONFIG.homepageSubtitle}
            />
          </s-stack>
        </s-section>

        <s-section heading="Spend tiers (cart subtotal)">
          <s-stack direction="block" gap="large">
          <s-paragraph>
            Discounts apply to the <strong>current cart</strong> subtotal (not
            lifetime loyalty). Amounts are in your shop currency. Use placeholders{" "}
            <code>{"{amount_remaining}"}</code> and <code>{"{next_discount}"}</code>{" "}
            in messages — replaced on the storefront later.
          </s-paragraph>

          <input type="hidden" name="tiersJson" value={JSON.stringify(tiers)} />

          <s-stack direction="block" gap="large">
            {tiers.map((tier, index) => (
              <s-box
                key={index}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
                <s-stack direction="block" gap="base">
                  <s-heading>Tier {index + 1}</s-heading>
                  <s-stack direction="inline" gap="base">
                    <s-text-field
                      label="Minimum cart spend ($)"
                      value={tier.minSpendDollars}
                      onChange={(e) =>
                        updateTier(
                          index,
                          "minSpendDollars",
                          e.currentTarget.value,
                        )
                      }
                      autocomplete="off"
                    />
                    <s-text-field
                      label="Order discount ($)"
                      value={tier.discountDollars}
                      onChange={(e) =>
                        updateTier(
                          index,
                          "discountDollars",
                          e.currentTarget.value,
                        )
                      }
                      autocomplete="off"
                    />
                  </s-stack>
                  <s-text-field
                    label="Message — far from tier"
                    value={tier.messageFar}
                    onChange={(e) =>
                      updateTier(index, "messageFar", e.currentTarget.value)
                    }
                  />
                  <s-text-field
                    label="Message — close to tier"
                    value={tier.messageClose}
                    onChange={(e) =>
                      updateTier(index, "messageClose", e.currentTarget.value)
                    }
                  />
                  <s-text-field
                    label="Message — tier unlocked"
                    value={tier.messageUnlocked}
                    onChange={(e) =>
                      updateTier(
                        index,
                        "messageUnlocked",
                        e.currentTarget.value,
                      )
                    }
                  />
                  <s-button
                    type="button"
                    variant="tertiary"
                    tone="critical"
                    onClick={() => removeTier(index)}
                  >
                    Remove tier
                  </s-button>
                </s-stack>
              </s-box>
            ))}
          </s-stack>

          <s-stack direction="inline" gap="base">
            <s-button
              type="button"
              onClick={addTier}
              disabled={tiers.length >= MAX_TIERS || undefined}
            >
              Add tier
            </s-button>
            <s-text>
              {tiers.length} / {MAX_TIERS} tiers
            </s-text>
          </s-stack>
          </s-stack>
        </s-section>
        </s-stack>
      </Form>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
