import type { Config } from "@react-router/dev/config";

export default {
  future: {
    v8_splitRouteModules: "enforce",
  },
  // Include all routes in the initial manifest (more reliable for production).
  routeDiscovery: {
    mode: "initial",
  },
  // Embedded Shopify admin posts form actions from admin.shopify.com to our app URL.
  // Without this, React Router 7 rejects the POST with "Bad Request" (CSRF check).
  allowedActionOrigins: [
    "admin.shopify.com",
    "cartquest.ktcloud365.com",
  ],
} satisfies Config;
