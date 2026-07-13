import { useEffect, useState } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

import {
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

  const cartProgressPasteCode = `<div data-cartquest-cart-progress style="display:block;margin-bottom:24px;"></div>`;

  const savedConfig = actionData?.ok ? actionData.config : loaderConfig;
  const formRows =
    actionData && !actionData.ok
      ? actionData.formRows
      : actionData?.ok
        ? actionData.formRows
        : loaderFormRows;

  const [tiers, setTiers] = useState<RewardTierFormRow[]>(formRows);
  const [enabled, setEnabled] = useState(savedConfig.enabled);
  const errors = actionData && !actionData.ok ? actionData.errors : [];
  const checkoutDiscountActive = actionData?.ok
    ? actionData.checkoutDiscountActive
    : loaderCheckoutDiscountActive;

  useEffect(() => {
    setTiers(formRows);
    setEnabled(savedConfig.enabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- savedConfig tracks formRows updates
  }, [formRows]);

  useEffect(() => {
    if (actionData?.ok === true) {
      shopify.toast.show(
        actionData.checkoutDiscountActive
          ? loaderCheckoutDiscountActive
            ? "Settings saved — checkout discount updated"
            : "CartQuest activated — checkout discounts are live"
          : "Settings saved",
      );
    }
  }, [actionData, shopify, loaderCheckoutDiscountActive]);

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
        <Form method="post" className={styles.formStack}>
          <div className={styles.headerRow}>
            <div className={styles.headerCopy}>
              <h2 className={styles.title}>Rewards settings</h2>
              <p className={styles.pageIntro}>
                Set cart spend goals and automatic discounts. Shoppers unlock a
                reward when their cart total reaches each tier.
              </p>
            </div>
            <button
              type="submit"
              className={styles.buttonPrimary}
              disabled={isSaving}
            >
              {isSaving
                ? "Saving…"
                : checkoutDiscountActive
                  ? "Save settings"
                  : "Save & activate"}
            </button>
          </div>

          {loadError && (
            <div className={styles.warningBox}>
              <p>{loadError}</p>
              <p className={styles.hint}>
                Showing default values. Click <strong>Save &amp; activate</strong>{" "}
                once to finish setup.
              </p>
            </div>
          )}

          {!loadError && (
            <>
              {!checkoutDiscountActive && (
                <div className={styles.getStartedCard} role="status">
                  <h3 className={styles.getStartedTitle}>
                    Get started — activate CartQuest
                  </h3>
                  <p className={styles.statusCardBody}>
                    Your reward tiers are ready below, but checkout discounts are
                    not live yet. Click <strong>Save &amp; activate</strong> once
                    to turn them on for this store.
                  </p>
                  <ol className={styles.setupSteps}>
                    <li>
                      Review your tiers (defaults are fine), then click{" "}
                      <strong>Save &amp; activate</strong>
                    </li>
                    <li>
                      Optionally add a progress bar on your cart page so shoppers
                      can see how close they are to a reward
                    </li>
                  </ol>
                </div>
              )}

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
                    {checkoutDiscountActive ? "Active" : "Not activated"}
                  </span>
                  <h3 className={styles.statusCardTitle}>Checkout discounts</h3>
                </div>
                {checkoutDiscountActive ? (
                  <>
                    <p className={styles.statusCardBody}>
                      Shoppers automatically get the matching discount at checkout
                      when their cart total reaches a tier.
                    </p>
                    <p className={styles.statusCardMeta}>
                      Look for <strong>CartQuest Rewards</strong> under Admin →
                      Discounts. Each save updates that discount.
                    </p>
                  </>
                ) : (
                  <p className={styles.statusCardBody}>
                    Not live yet. Click <strong>Save &amp; activate</strong> to
                    create the CartQuest Rewards discount. After that, saving only
                    updates your tier amounts.
                  </p>
                )}
              </div>

              <div className={styles.statusCard}>
                <div className={styles.statusCardHeader}>
                  <h3 className={styles.statusCardTitle}>
                    Show a progress bar on the cart page{" "}
                    <span className={styles.optionalLabel}>(optional)</span>
                  </h3>
                </div>
                <p className={styles.setupIntro}>
                  Helps shoppers see how much more they need to spend to unlock
                  the next reward. Choose <strong>one</strong> option below — do
                  not use both on the same cart page.
                </p>

                <div className={styles.setupOption}>
                  <div className={styles.setupOptionHeader}>
                    <p className={styles.setupSubtitle}>
                      Option A — Use the theme editor
                    </p>
                    <span className={styles.recommendedPill}>Recommended</span>
                  </div>
                  <p className={styles.setupOptionHint}>
                    No code needed. Best for most stores.
                  </p>
                  <ol className={styles.setupSteps}>
                    <li>
                      Go to Online Store → Themes → <strong>Customize</strong>
                    </li>
                    <li>
                      Open the <strong>Cart</strong> page
                    </li>
                    <li>
                      Select your cart items section → <strong>Add block</strong>{" "}
                      → <strong>Apps</strong>
                    </li>
                    <li>
                      Choose <strong>Cart tier progress</strong> and place it
                      above the product list
                    </li>
                    <li>
                      Click <strong>Save</strong>
                    </li>
                  </ol>
                </div>

                <div className={styles.setupOption}>
                  <div className={styles.setupOptionHeader}>
                    <p className={styles.setupSubtitle}>
                      Option B — Paste a short code snippet
                    </p>
                  </div>
                  <p className={styles.setupOptionHint}>
                    Only if Option A is not available for your theme.
                  </p>
                  <ol className={styles.setupSteps}>
                    <li>
                      Customize → <strong>Theme settings</strong> →{" "}
                      <strong>App embeds</strong> → turn on{" "}
                      <strong>Cart progress paste</strong>
                    </li>
                    <li>
                      Online Store → Themes → <strong>Edit code</strong> → open
                      your cart section file (often{" "}
                      <code>sections/main-cart-items.liquid</code>)
                    </li>
                    <li>
                      Paste this line where the bar should appear (above the
                      product list, outside any <code>&lt;table&gt;</code>):
                    </li>
                  </ol>
                  <pre className={styles.codeBlock}>{cartProgressPasteCode}</pre>
                  <ol
                    className={`${styles.setupSteps} ${styles.setupStepsContinue}`}
                    start={4}
                  >
                    <li>Save the theme file</li>
                  </ol>
                  <p className={styles.tipBox}>
                    Tip: Also turn on <strong>Cart drawer guard</strong> under App
                    embeds. That keeps the progress bar off the cart drawer so it
                    only shows on the cart page.
                  </p>
                </div>

                <div className={styles.setupActions}>
                  <a
                    href="shopify:admin/themes/current/editor?template=cart"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.buttonSecondary}
                  >
                    Open theme editor (Cart)
                  </a>
                  <a
                    href="shopify:admin/themes/current/editor?context=apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.buttonSecondary}
                  >
                    Open app embeds
                  </a>
                </div>
              </div>
            </>
          )}

          {errors.length > 0 && (
            <div className={styles.errorBox}>
              <strong>Please fix these issues:</strong>
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
              <span>Rewards program is on</span>
            </label>
            <p className={styles.hint}>
              Turn this off to temporarily hide rewards on your store and pause
              checkout discounts.
            </p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Reward tiers</h3>
            <p className={styles.hint}>
              Based on the current cart total (not lifetime spending). Amounts use
              your shop&apos;s currency.
            </p>

            <input type="hidden" name="tiersJson" value={JSON.stringify(tiers)} />

            {tiers.map((tier, index) => (
              <div key={`tier-${index}`} className={styles.tierCard}>
                <h4 className={styles.tierTitle}>Tier {index + 1}</h4>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Cart total needed to unlock ($)
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
                    <label className={styles.label}>
                      Discount shoppers get ($)
                    </label>
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
            Add another tier
          </button>
          <span className={styles.hint}>
            {tiers.length} of {MAX_TIERS} tiers used
          </span>
        </div>
      </div>
    </s-page>
  );
}
