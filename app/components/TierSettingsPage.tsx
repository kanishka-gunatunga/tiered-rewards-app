import { useEffect, useState } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
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

type TiersLoaderData = {
  apiKey: string;
  config: TierRewardsConfig;
  formRows: RewardTierFormRow[];
  loadError: string | null;
  checkoutDiscountActive: boolean;
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
      checkoutDiscountActive: boolean;
    }
  | undefined;

export default function TierSettingsPage() {
  const loaderData = useLoaderData<TiersLoaderData>();
  const actionData = useActionData<TiersActionData>();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const isSaving =
    navigation.state === "submitting" && navigation.formMethod === "POST";

  const {
    loadError,
    config: loaderConfig,
    formRows: loaderFormRows,
    checkoutDiscountActive: loaderCheckoutDiscountActive,
  } = loaderData;

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
  const [primaryColor, setPrimaryColor] = useState(savedConfig.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(savedConfig.secondaryColor);
  const [backgroundColor, setBackgroundColor] = useState(savedConfig.backgroundColor);
  const [enabled, setEnabled] = useState(savedConfig.enabled);
  const errors = actionData && !actionData.ok ? actionData.errors : [];
  const checkoutDiscountActive = actionData?.ok
    ? actionData.checkoutDiscountActive
    : loaderCheckoutDiscountActive;

  useEffect(() => {
    setTiers(formRows);
    setTitle(savedConfig.title);
    setProgramTitle(savedConfig.programTitle);
    setHomepageSubtitle(savedConfig.homepageSubtitle);
    setPrimaryColor(savedConfig.primaryColor);
    setSecondaryColor(savedConfig.secondaryColor);
    setBackgroundColor(savedConfig.backgroundColor);
    setEnabled(savedConfig.enabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- savedConfig tracks formRows updates
  }, [formRows]);

  useEffect(() => {
    if (actionData?.ok === true) {
      shopify.toast.show(
        actionData.checkoutDiscountActive
          ? "Settings saved — checkout discount is active"
          : "Settings saved",
      );
    }
  }, [actionData, shopify]);

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

          {!loadError && (
            <>
              <div
                className={`${styles.statusCard} ${
                  checkoutDiscountActive
                    ? styles.statusCardSuccess
                    : styles.statusCardPending
                }`}
                role="status"
              >
                <div className={styles.statusCardHeader}>
                  <span
                    className={`${styles.statusBadge} ${
                      checkoutDiscountActive
                        ? styles.statusBadgeSuccess
                        : styles.statusBadgePending
                    }`}
                  >
                    {checkoutDiscountActive ? "Active" : "Setup needed"}
                  </span>
                  <h3 className={styles.statusCardTitle}>Checkout discounts</h3>
                </div>
                {checkoutDiscountActive ? (
                  <>
                    <p className={styles.statusCardBody}>
                      Tier discounts are applied automatically at checkout when a
                      customer&apos;s cart subtotal reaches each level you
                      configure below.
                    </p>
                    <p className={styles.statusCardMeta}>
                      Shopify discount: <strong>Cart tier rewards</strong>{" "}
                      (Admin → Discounts). Saving settings updates this discount.
                    </p>
                  </>
                ) : (
                  <p className={styles.statusCardBody}>
                    Save your settings once to activate checkout discounts. After
                    that, each save updates your tiers for customers at checkout.
                  </p>
                )}
              </div>

              <div className={styles.statusCard}>
                <div className={styles.statusCardHeader}>
                  <h3 className={styles.statusCardTitle}>Storefront setup</h3>
                </div>
                <p className={styles.statusCardBody} style={{ marginBottom: "12px" }}>
                  To show the rewards progress bar on your storefront, enable it in your theme editor.
                </p>
                <ul className={styles.errorList} style={{ color: "#4a5565", marginBottom: "16px" }}>
                  <li><strong>Option 1 (App Embed):</strong> Enable the "Cart rewards embed" in Theme Settings &rarr; App embeds. It automatically displays on the cart page.</li>
                  <li><strong>Option 2 (App Block):</strong> Add the "Tier rewards progress" block directly to your Cart template sections.</li>
                </ul>
                <a
                  href="shopify:admin/themes/current/editor?context=apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.buttonSecondary}
                  style={{ textDecoration: "none", display: "inline-block" }}
                >
                  Open theme editor
                </a>
              </div>
            </>
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

          <section className={`${styles.section} ${styles.sectionSpaced}`}>
            <h3 className={styles.sectionTitle}>Design (Storefront)</h3>
            <p className={styles.hint}>
              Customize the colors of the progress bar to match your brand.
            </p>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="primaryColor">
                  Primary color
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    id="primaryColor"
                    name="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'monospace' }}>{primaryColor}</span>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="secondaryColor">
                  Secondary color
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    id="secondaryColor"
                    name="secondaryColor"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'monospace' }}>{secondaryColor}</span>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="backgroundColor">
                  Background color
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    id="backgroundColor"
                    name="backgroundColor"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'monospace' }}>{backgroundColor}</span>
                </div>
              </div>
            </div>
          </section>

          <section className={`${styles.section} ${styles.sectionSpaced}`}>
            <h3 className={styles.sectionTitle}>Spend tiers (cart subtotal)</h3>
            <p className={styles.hint}>
              Discounts apply to the current cart subtotal (not lifetime
              loyalty). Amounts are in your shop currency.
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
