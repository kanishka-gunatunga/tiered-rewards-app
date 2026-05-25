import { useEffect, useState } from "react";
import {
  Form,
  useActionData,
  useRouteLoaderData,
  useNavigation,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

import {
  DEFAULT_TIER_REWARDS_CONFIG,
  EMPTY_TIER_ROW,
  MAX_TIERS,
  type RewardTierFormRow,
  type TierRewardsConfig,
} from "../lib/tier-rewards.shared";

import styles from "../styles/tier-settings.module.css";

type AppRouteLoaderData = {
  apiKey: string;
  config: TierRewardsConfig;
  formRows: RewardTierFormRow[];
  loadError: string | null;
};

type TiersActionData =
  | {
      ok: false;
      errors: string[];
      formRows: RewardTierFormRow[];
      config: TierRewardsConfig;
    }
  | {
      ok: true;
      config: TierRewardsConfig;
      formRows: RewardTierFormRow[];
    }
  | undefined;

export default function TierSettingsPage() {
  const loaderData = useRouteLoaderData("routes/app") as AppRouteLoaderData;
  const actionData = useActionData<TiersActionData>();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const isSaving =
    navigation.state === "submitting" && navigation.formMethod === "POST";

  const { loadError, config: loaderConfig, formRows: loaderFormRows } =
    loaderData;

  const savedConfig = actionData?.ok ? actionData.config : loaderConfig;
  const formRows =
    actionData && !actionData.ok
      ? actionData.formRows
      : actionData?.ok
        ? actionData.formRows
        : loaderFormRows;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- savedConfig tracks formRows updates
  }, [formRows]);

  useEffect(() => {
    if (actionData?.ok) {
      shopify.toast.show("Rewards settings saved");
    }
  }, [actionData?.ok, shopify]);

  const addTier = () => {
    if (tiers.length >= MAX_TIERS) return;
    setTiers((current) => [...current, { ...EMPTY_TIER_ROW }]);
  };

  const removeTier = (index: number) => {
    setTiers((current) => current.filter((_, i) => i !== index));
  };

  const updateTier = (
    index: number,
    field: keyof RewardTierFormRow,
    value: string,
  ) => {
    setTiers((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  return (
    <s-page heading="Rewards tiers">
      <div className={styles.page}>
        <Form method="post">
          <div className={styles.headerRow}>
            <h2 className={styles.title}>Rewards settings</h2>
            <button
              type="submit"
              className={styles.buttonPrimary}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Save settings"}
            </button>
          </div>

          {loadError && (
            <div className={styles.warningBox}>
              <p>{loadError}</p>
              <p className={styles.hint}>
                Showing default values. Save once to create the config in
                Shopify.
              </p>
            </div>
          )}

          {errors.length > 0 && (
            <div className={styles.errorBox}>
              <strong>Fix these issues:</strong>
              <ul className={styles.errorList}>
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Program</h3>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                name="enabled"
                value="on"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>Program enabled</span>
            </label>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="config-title">
                Config title (internal)
              </label>
              <input
                id="config-title"
                className={styles.input}
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="program-title">
                Program title (storefront)
              </label>
              <input
                id="program-title"
                className={styles.input}
                name="programTitle"
                value={programTitle}
                onChange={(e) => setProgramTitle(e.target.value)}
                placeholder={DEFAULT_TIER_REWARDS_CONFIG.programTitle}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="homepage-subtitle">
                Homepage subtitle
              </label>
              <input
                id="homepage-subtitle"
                className={styles.input}
                name="homepageSubtitle"
                value={homepageSubtitle}
                onChange={(e) => setHomepageSubtitle(e.target.value)}
                placeholder={DEFAULT_TIER_REWARDS_CONFIG.homepageSubtitle}
              />
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Spend tiers (cart subtotal)</h3>
            <p className={styles.hint}>
              Discounts apply to the current cart subtotal (not lifetime
              loyalty). Amounts are in your shop currency. Use placeholders{" "}
              <code>{"{amount_remaining}"}</code> and{" "}
              <code>{"{next_discount}"}</code> in messages.
            </p>

            <input type="hidden" name="tiersJson" value={JSON.stringify(tiers)} />

            {tiers.map((tier, index) => (
              <div key={`tier-${index}`} className={styles.tierCard}>
                <h4 className={styles.tierTitle}>Tier {index + 1}</h4>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Minimum cart spend ($)
                    </label>
                    <input
                      className={styles.input}
                      type="text"
                      inputMode="decimal"
                      value={tier.minSpendDollars}
                      onChange={(e) =>
                        updateTier(index, "minSpendDollars", e.target.value)
                      }
                      autoComplete="off"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Order discount ($)</label>
                    <input
                      className={styles.input}
                      type="text"
                      inputMode="decimal"
                      value={tier.discountDollars}
                      onChange={(e) =>
                        updateTier(index, "discountDollars", e.target.value)
                      }
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Message — far from tier</label>
                  <textarea
                    className={styles.textarea}
                    value={tier.messageFar}
                    onChange={(e) =>
                      updateTier(index, "messageFar", e.target.value)
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Message — close to tier</label>
                  <textarea
                    className={styles.textarea}
                    value={tier.messageClose}
                    onChange={(e) =>
                      updateTier(index, "messageClose", e.target.value)
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Message — tier unlocked</label>
                  <textarea
                    className={styles.textarea}
                    value={tier.messageUnlocked}
                    onChange={(e) =>
                      updateTier(index, "messageUnlocked", e.target.value)
                    }
                  />
                </div>
                <button
                  type="button"
                  className={styles.buttonDanger}
                  onClick={() => removeTier(index)}
                >
                  Remove tier
                </button>
              </div>
            ))}
          </section>
        </Form>

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={addTier}
            disabled={tiers.length >= MAX_TIERS}
          >
            Add tier
          </button>
          <span className={styles.hint}>
            {tiers.length} / {MAX_TIERS} tiers
          </span>
        </div>
      </div>
    </s-page>
  );
}
