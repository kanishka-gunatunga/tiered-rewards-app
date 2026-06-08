import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received compliance webhook ${topic} for ${shop}`);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
      // We do not store any customer-specific PII or order data in our database.
      // So there is nothing to provide or redact for individual customers.
      break;

    case "SHOP_REDACT":
      // 48 hours after a store owner uninstalls your app, Shopify sends a payload on the shop/redact topic.
      // Delete any data for that shop from our database.
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      } else {
        await db.session.deleteMany({ where: { shop } });
      }
      break;

    default:
      console.warn(`Unhandled compliance topic: ${topic}`);
  }

  return new Response();
};
