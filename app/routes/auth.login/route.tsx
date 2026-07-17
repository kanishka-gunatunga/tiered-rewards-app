import { AppProvider } from "@shopify/shopify-app-react-router/react";
import type { LoaderFunctionArgs } from "react-router";

import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // OAuth may still pass ?shop= here during install; delegate to Shopify login.
  await login(request);
  return null;
};

export default function Auth() {
  return (
    <AppProvider embedded={false}>
      <s-page heading="CartQuest">
        <s-section heading="Install from Shopify">
          <s-paragraph>
            Open CartQuest from the Shopify App Store or from Apps in your Shopify
            Admin. Merchants are signed in automatically through Shopify — you do
            not need to enter a shop domain here.
          </s-paragraph>
        </s-section>
      </s-page>
    </AppProvider>
  );
}
