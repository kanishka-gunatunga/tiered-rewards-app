import type { authenticate } from "../shopify.server";
import type { TierRewardsConfig } from "./tier-rewards.shared";

type AdminGraphQLClient = Awaited<
  ReturnType<typeof authenticate.admin>
>["admin"];

/** Must match `handle` in extensions/tier-cart-discount/shopify.extension.toml */
export const TIER_DISCOUNT_FUNCTION_HANDLE = "tier-cart-discount";

/** Must match [discount.metafields.app.tier_rewards_config] in shopify.app.toml */
export const TIER_DISCOUNT_METAFIELD_KEY = "tier_rewards_config";

export const TIER_DISCOUNT_TITLE = "CartQuest Rewards";

const LIST_APP_DISCOUNTS_QUERY = `#graphql
  query ListAppAutomaticDiscounts {
    discountNodes(first: 25, query: "type:app") {
      nodes {
        id
        discount {
          ... on DiscountAutomaticApp {
            discountId
            title
            status
          }
        }
      }
    }
  }
`;

/** Allow tier rewards to stack with member/product pricing and other discounts. */
const DISCOUNT_COMBINES_WITH = {
  orderDiscounts: true,
  productDiscounts: true,
  shippingDiscounts: true,
};

const CREATE_DISCOUNT_MUTATION = `#graphql
  mutation CreateTierCartDiscount($discount: DiscountAutomaticAppInput!) {
    discountAutomaticAppCreate(automaticAppDiscount: $discount) {
      automaticAppDiscount {
        discountId
        title
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const UPDATE_DISCOUNT_MUTATION = `#graphql
  mutation UpdateTierCartDiscount($id: ID!, $discount: DiscountAutomaticAppInput!) {
    discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $discount) {
      automaticAppDiscount {
        discountId
        title
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const SET_METAFIELDS_MUTATION = `#graphql
  mutation SetTierDiscountMetafield($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type GraphqlPayload = {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string }>;
};

function assertGraphqlOk(payload: GraphqlPayload, context: string): void {
  if (payload.errors?.length) {
    throw new Error(
      `${context}: ${payload.errors.map((e) => e.message).join("; ")}`,
    );
  }
}

function functionConfigJson(config: TierRewardsConfig): string {
  return JSON.stringify({
    enabled: config.enabled,
    tiers: config.tiers,
  });
}

function metafieldInput(config: TierRewardsConfig) {
  return {
    namespace: "$app",
    key: TIER_DISCOUNT_METAFIELD_KEY,
    type: "json",
    value: functionConfigJson(config),
  };
}

type CartQuestDiscountRef = {
  nodeId: string;
  discountId: string;
};

export async function hasTierCartDiscount(
  admin: AdminGraphQLClient,
): Promise<boolean> {
  const discount = await findCartQuestDiscount(admin);
  return Boolean(discount);
}

async function findCartQuestDiscount(
  admin: AdminGraphQLClient,
): Promise<CartQuestDiscountRef | null> {
  const response = await admin.graphql(LIST_APP_DISCOUNTS_QUERY);
  const payload = (await response.json()) as GraphqlPayload;
  assertGraphqlOk(payload, "List discounts");

  const nodes =
    (payload.data?.discountNodes as { nodes?: Array<Record<string, unknown>> })
      ?.nodes ?? [];

  for (const node of nodes) {
    const discount = node.discount as
      | { discountId?: string; title?: string }
      | undefined;
    const nodeId = typeof node.id === "string" ? node.id : null;
    if (
      nodeId &&
      discount?.title === TIER_DISCOUNT_TITLE &&
      discount.discountId
    ) {
      return { nodeId, discountId: discount.discountId };
    }
  }

  return null;
}

async function createAutomaticDiscount(
  admin: AdminGraphQLClient,
  config: TierRewardsConfig,
): Promise<string> {
  const startsAt = new Date().toISOString();
  const response = await admin.graphql(CREATE_DISCOUNT_MUTATION, {
    variables: {
      discount: {
        title: TIER_DISCOUNT_TITLE,
        functionHandle: TIER_DISCOUNT_FUNCTION_HANDLE,
        discountClasses: ["ORDER"],
        combinesWith: DISCOUNT_COMBINES_WITH,
        startsAt,
        metafields: [metafieldInput(config)],
      },
    },
  });
  const payload = (await response.json()) as GraphqlPayload;
  assertGraphqlOk(payload, "Create discount");

  const createResult = payload.data?.discountAutomaticAppCreate as
    | {
        userErrors?: Array<{ message: string }>;
        automaticAppDiscount?: { discountId?: string };
      }
    | undefined;

  const userErrors = createResult?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(
      userErrors.map((e) => e.message).join("; "),
    );
  }

  const discountId = createResult?.automaticAppDiscount?.discountId;
  if (!discountId) {
    throw new Error(
      "Create discount returned no discountId. Run shopify app deploy to publish the checkout discount function, then save again.",
    );
  }

  return discountId;
}

async function updateAutomaticDiscount(
  admin: AdminGraphQLClient,
  nodeId: string,
): Promise<void> {
  const response = await admin.graphql(UPDATE_DISCOUNT_MUTATION, {
    variables: {
      id: nodeId,
      discount: {
        combinesWith: DISCOUNT_COMBINES_WITH,
      },
    },
  });
  const payload = (await response.json()) as GraphqlPayload;
  assertGraphqlOk(payload, "Update discount");

  const userErrors =
    (
      payload.data?.discountAutomaticAppUpdate as {
        userErrors?: Array<{ message: string }>;
      }
    )?.userErrors ?? [];

  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e) => e.message).join("; "));
  }
}

async function setDiscountMetafield(
  admin: AdminGraphQLClient,
  discountId: string,
  config: TierRewardsConfig,
): Promise<void> {
  const response = await admin.graphql(SET_METAFIELDS_MUTATION, {
    variables: {
      metafields: [
        {
          ownerId: discountId,
          ...metafieldInput(config),
        },
      ],
    },
  });
  const payload = (await response.json()) as GraphqlPayload;
  assertGraphqlOk(payload, "Set discount metafield");

  const userErrors =
    (
      payload.data?.metafieldsSet as {
        userErrors?: Array<{ message: string }>;
      }
    )?.userErrors ?? [];

  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e) => e.message).join("; "));
  }
}

/**
 * Copies tier settings onto the automatic app discount so the checkout function can read them.
 */
export async function syncTierRewardsDiscount(
  admin: AdminGraphQLClient,
  config: TierRewardsConfig,
): Promise<{ discountId: string }> {
  const existing = await findCartQuestDiscount(admin);

  if (!existing) {
    const discountId = await createAutomaticDiscount(admin, config);
    return { discountId };
  }

  await setDiscountMetafield(admin, existing.discountId, config);
  await updateAutomaticDiscount(admin, existing.nodeId);

  return { discountId: existing.discountId };
}
