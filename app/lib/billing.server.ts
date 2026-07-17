import type { BillingCheckResponseObject } from "@shopify/shopify-api";

import { isBillingTestMode, MONTHLY_PLAN } from "../shopify.server";

const SHOP_PLAN_QUERY = `#graphql
  query BillingShopPlan {
    shop {
      plan {
        partnerDevelopment
        publicDisplayName
      }
    }
  }
`;

type BillingApi = {
  check: (options: {
    plans: (typeof MONTHLY_PLAN)[];
    isTest: boolean;
  }) => Promise<BillingCheckResponseObject>;
  require: (options: {
    plans: (typeof MONTHLY_PLAN)[];
    isTest: boolean;
    onFailure: () => Promise<never>;
  }) => Promise<BillingCheckResponseObject>;
  request: (options: {
    plan: typeof MONTHLY_PLAN;
    isTest: boolean;
  }) => Promise<never>;
};

type AdminGraphql = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

const BILLING_RETURN_PARAMS = ["charge_id", "chargeId"];

function isBillingReturnRequest(request: Request): boolean {
  const url = new URL(request.url);
  return BILLING_RETURN_PARAMS.some((param) => url.searchParams.has(param));
}

function logBillingCheck(
  label: string,
  isTest: boolean,
  check: BillingCheckResponseObject,
): void {
  console.info(`[billing] ${label}`, {
    isTest,
    plan: MONTHLY_PLAN,
    hasActivePayment: check.hasActivePayment,
    subscriptions: check.appSubscriptions.map((subscription) => ({
      id: subscription.id,
      name: subscription.name,
      test: subscription.test,
      status: subscription.status,
    })),
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Partner development stores cannot accept real app charges.
 * Use test billing there so merchants can complete the approval flow.
 * Paid merchant stores always use production billing ($20/mo).
 */
export async function resolveBillingIsTest(admin: AdminGraphql): Promise<boolean> {
  if (isBillingTestMode) {
    console.info("[billing] local test mode enabled (SHOPIFY_BILLING_TEST_MODE)");
    return true;
  }

  try {
    const response = await admin.graphql(SHOP_PLAN_QUERY);
    const json = (await response.json()) as {
      data?: {
        shop?: {
          plan?: {
            partnerDevelopment?: boolean;
            publicDisplayName?: string;
          };
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) {
      console.error("[billing] shop plan query errors", json.errors);
    }

    const plan = json.data?.shop?.plan;
    const partnerDevelopment = plan?.partnerDevelopment === true;
    const planName = plan?.publicDisplayName ?? "unknown";
    const isDevelopmentPlan = planName.toLowerCase() === "development";
    const useTestBilling = partnerDevelopment || isDevelopmentPlan;

    console.info("[billing] shop plan resolved", {
      partnerDevelopment,
      publicDisplayName: planName,
      isTest: useTestBilling,
    });

    if (useTestBilling) {
      console.info(
        "[billing] development store — using test charge (approve without a card; $0 is expected)",
      );
      return true;
    }
  } catch (error) {
    console.error(
      "[billing] could not read shop plan; defaulting to production billing",
      error,
    );
  }

  return false;
}

/**
 * Gate admin routes behind an active Premium Plan subscription.
 * Retries once after a billing-approval redirect while Shopify activates the charge.
 */
export async function requireActiveSubscription(
  billing: BillingApi,
  admin: AdminGraphql,
  request: Request,
): Promise<void> {
  const isTest = await resolveBillingIsTest(admin);

  let check = await billing.check({
    plans: [MONTHLY_PLAN],
    isTest,
  });
  logBillingCheck("check", isTest, check);

  if (check.hasActivePayment) {
    return;
  }

  if (isBillingReturnRequest(request)) {
    await sleep(2000);
    check = await billing.check({
      plans: [MONTHLY_PLAN],
      isTest,
    });
    logBillingCheck("post-approval retry", isTest, check);

    if (check.hasActivePayment) {
      return;
    }
  }

  console.info("[billing] no active subscription — requesting approval", {
    plan: MONTHLY_PLAN,
    isTest,
  });

  await billing.require({
    plans: [MONTHLY_PLAN],
    isTest,
    onFailure: async () =>
      billing.request({ plan: MONTHLY_PLAN, isTest }),
  });
}
