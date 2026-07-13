import styles from "../../styles/privacy.module.css";

const COMPANY_NAME = process.env.COMPANY_NAME || "Kode Tech";
const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || "hellokodetech@gmail.com";
const PRIVACY_EMAIL =
  process.env.PRIVACY_EMAIL || "hellokodetech@gmail.com";
const LAST_UPDATED = "July 13, 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <p className={styles.brand}>CartQuest</p>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.meta}>Last updated: {LAST_UPDATED}</p>

        <p className={styles.lead}>
          CartQuest (“the App”) is a Shopify application provided by{" "}
          {COMPANY_NAME}. This policy explains what information the App uses,
          how it is stored, and how merchants can contact us.
        </p>

        <section className={styles.section}>
          <h2>1. Who this policy covers</h2>
          <p>
            This policy applies to merchants who install CartQuest on their
            Shopify store. It does not replace Shopify’s own privacy policy for
            shopper checkout data handled by Shopify.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Information we collect</h2>
          <ul>
            <li>
              Shop domain and Shopify shop identifiers needed to install and run
              the App
            </li>
            <li>
              App session / authentication tokens used to keep merchants signed
              in to the embedded admin App
            </li>
            <li>
              Rewards configuration merchants save in the App (for example tier
              spend amounts, discount amounts, and whether the program is on).
              This configuration is stored in Shopify metaobjects owned by the
              App on the merchant’s shop
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Information we do not collect</h2>
          <ul>
            <li>
              We do not store customer personal information (such as names,
              emails, addresses, phone numbers, or payment card details) in our
              own database for CartQuest’s core features
            </li>
            <li>
              Order processing and checkout discount application are handled by
              Shopify systems after the merchant activates the App’s automatic
              discount
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. How we use information</h2>
          <ul>
            <li>Authenticate merchants and operate the embedded admin App</li>
            <li>
              Save and update rewards settings, and create/update the automatic
              checkout discount named “CartQuest Rewards”
            </li>
            <li>
              Respond to Shopify compliance webhooks and lawful requests when
              required
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Where information is stored</h2>
          <ul>
            <li>
              App sessions: our application database (PostgreSQL) on our hosting
              infrastructure
            </li>
            <li>
              Rewards configuration: Shopify metaobjects on the merchant’s shop
            </li>
            <li>
              Checkout discount configuration: Shopify Discounts / related app
              discount metafields
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Data retention and deletion</h2>
          <ul>
            <li>
              When a merchant uninstalls the App, we delete stored session data
              for that shop after receiving Shopify’s shop/redact compliance
              webhook
            </li>
            <li>
              We respond to Shopify customer compliance topics
              (customers/data_request and customers/redact). Because we do not
              store customer PII for CartQuest’s core features, there is
              typically no customer record to export or erase from our database
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. Sharing</h2>
          <ul>
            <li>We do not sell merchant or customer data</li>
            <li>
              We share data with Shopify only as needed to operate the App, or
              when required by law
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>8. Contact</h2>
          <p>
            Privacy questions:{" "}
            <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
          </p>
          <p>
            Support: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
          <p>Provider: {COMPANY_NAME}</p>
        </section>

        <p className={styles.footerNote}>
          If these contact addresses change, we will update this page. Merchants
          can also reach us through the support details listed on the Shopify App
          Store listing.
        </p>
      </article>
    </main>
  );
}
