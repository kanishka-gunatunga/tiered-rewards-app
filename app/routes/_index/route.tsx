import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <p className={styles.brand}>CartQuest</p>
        <h1 className={styles.heading}>
          Tiered cart rewards that unlock as shoppers spend more
        </h1>
        <p className={styles.text}>
          Set spend goals, apply automatic checkout discounts, and optionally show
          a progress bar on the cart page — all from Shopify Admin.
        </p>

        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input
                className={styles.input}
                type="text"
                name="shop"
                placeholder="your-store.myshopify.com"
                autoComplete="off"
                spellCheck={false}
              />
              <span className={styles.fieldHint}>
                Example: my-store.myshopify.com
              </span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}

        <ul className={styles.list}>
          <li>
            <strong>Spend tiers</strong>
            Configure cart totals and discount amounts in minutes.
          </li>
          <li>
            <strong>Checkout discounts</strong>
            Rewards apply automatically when shoppers reach each tier.
          </li>
          <li>
            <strong>Cart progress bar</strong>
            Show shoppers how close they are to the next reward.
          </li>
        </ul>

        <p className={styles.legalLinks}>
          <a href="/privacy.html">Privacy policy</a>
        </p>
      </div>
    </div>
  );
}
