import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export const MONTHLY_PLAN = "Premium Plan";
export const MONTHLY_PLAN_AMOUNT_USD = 20;
export const MONTHLY_PLAN_TRIAL_DAYS = 14;

/** Local-only override via SHOPIFY_BILLING_TEST_MODE=true (never used on production). */
export const isBillingTestMode =
  process.env.NODE_ENV !== "production" &&
  process.env.SHOPIFY_BILLING_TEST_MODE === "true";

if (
  process.env.NODE_ENV === "production" &&
  process.env.SHOPIFY_BILLING_TEST_MODE === "true"
) {
  console.error(
    "[billing] SHOPIFY_BILLING_TEST_MODE=true is set on production but ignored. " +
      "CartQuest uses real billing ($20/mo). Remove this variable from the server .env.",
  );
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: {
    [MONTHLY_PLAN]: {
      trialDays: MONTHLY_PLAN_TRIAL_DAYS,
      lineItems: [
        {
          amount: MONTHLY_PLAN_AMOUNT_USD,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
  },
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
