import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, redirect, useRouteError, useRouteLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import {
  configToFormRows,
  DEFAULT_TIER_REWARDS_CONFIG,
  loadTierRewardsConfig,
  parseConfigFromFormData,
  saveTierRewardsConfig,
} from "../lib/tier-rewards.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.pathname === "/app/tiers" || url.pathname.endsWith("/app/tiers")) {
    throw redirect("/app");
  }

  const { admin } = await authenticate.admin(request);

  let tierData = {
    config: { ...DEFAULT_TIER_REWARDS_CONFIG },
    formRows: configToFormRows(DEFAULT_TIER_REWARDS_CONFIG),
    loadError: null as string | null,
  };

  try {
    const config = await loadTierRewardsConfig(admin);
    tierData = {
      config,
      formRows: configToFormRows(config),
      loadError: null,
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

type AppLayoutLoaderData = {
  apiKey: string;
};

export default function App() {
  const data = useRouteLoaderData("routes/app") as AppLayoutLoaderData | undefined;
  const apiKey = data?.apiKey ?? "";

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Rewards settings</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
