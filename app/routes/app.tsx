import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import TierSettingsPage from "../components/TierSettingsPage";
import {
  hasTierCartDiscount,
  syncTierRewardsDiscount,
} from "../lib/tier-rewards-discount.server";
import {
  configToFormRows,
  DEFAULT_TIER_REWARDS_CONFIG,
  loadTierRewardsConfig,
  parseConfigFromFormData,
  saveTierRewardsConfig,
} from "../lib/tier-rewards.server";
import { requireActiveSubscription } from "../lib/billing.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.pathname === "/app/tiers" || url.pathname.endsWith("/app/tiers")) {
    throw redirect("/app");
  }

  const { admin, billing } = await authenticate.admin(request);

  await requireActiveSubscription(billing, admin, request);

  let tierData = {
    config: { ...DEFAULT_TIER_REWARDS_CONFIG },
    formRows: configToFormRows(DEFAULT_TIER_REWARDS_CONFIG),
    loadError: null as string | null,
    checkoutDiscountActive: false,
  };

  try {
    const config = await loadTierRewardsConfig(admin);
    let checkoutDiscountActive = false;
    try {
      checkoutDiscountActive = await hasTierCartDiscount(admin);
    } catch (discountCheckError) {
      console.error("[app] discount status check failed:", discountCheckError);
    }
    tierData = {
      config,
      formRows: configToFormRows(config),
      loadError: null,
      checkoutDiscountActive,
    };
  } catch (error) {
    console.error("[app] tier settings loader failed:", error);
    tierData.loadError =
      error instanceof Error
        ? error.message
        : "Could not load rewards settings. Using defaults.";
  }

  return {
    // eslint-disable-next-line no-undef
    apiKey: process.env.SHOPIFY_API_KEY || "",
    ...tierData,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { admin, billing } = await authenticate.admin(request);
    await requireActiveSubscription(billing, admin, request);

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

    let checkoutDiscountActive = false;
    try {
      await syncTierRewardsDiscount(admin, config);
      checkoutDiscountActive = true;
    } catch (error) {
      console.error("[app] discount sync failed:", error);
      return {
        ok: false as const,
        errors: [
          error instanceof Error
            ? error.message
            : "Settings saved but checkout discount could not be updated. Run shopify app deploy, then save again.",
        ],
        formRows: configToFormRows(config),
        config,
        checkoutDiscountActive: false,
      };
    }

    return {
      ok: true as const,
      config,
      formRows: configToFormRows(config),
      checkoutDiscountActive,
    };
  } catch (error) {
    console.error("[app] save settings action failed:", error);
    return {
      ok: false as const,
      errors: [
        error instanceof Error
          ? error.message
          : "Could not save settings. Check server logs (pm2 logs cartquest).",
      ],
      formRows: configToFormRows(DEFAULT_TIER_REWARDS_CONFIG),
      config: { ...DEFAULT_TIER_REWARDS_CONFIG },
    };
  }
};

type AppLoaderData = {
  apiKey: string;
};

export default function App() {
  const { apiKey } = useLoaderData<AppLoaderData>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Rewards settings</s-link>
      </s-app-nav>
      <TierSettingsPage />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (error instanceof Error && error.message) {
    return (
      <s-page heading="Rewards tiers">
        <div style={{ padding: "16px" }}>
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
        </div>
      </s-page>
    );
  }
  return boundary.error(error);
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
