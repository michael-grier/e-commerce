import { describe, expect, test } from "bun:test";

import config from "../playwright.config";
import { disableTestNotifications } from "../scripts/test-notifications";

describe("test notification isolation", () => {
  test("replaces inherited notification credentials without changing the test database", () => {
    const environment: NodeJS.ProcessEnv = {
      NODE_ENV: "test",
      RESEND_API_KEY: "configured-email-key",
      SENTRY_DSN: "https://public@o0.ingest.us.sentry.io/0",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@o0.ingest.us.sentry.io/0",
      SENTRY_AUTH_TOKEN: "configured-upload-token",
      DATABASE_URL: "postgres://u:p@localhost/test",
    };

    disableTestNotifications(environment);

    expect(environment).toEqual({
      NODE_ENV: "test",
      RESEND_API_KEY: "",
      SENTRY_DSN: "",
      NEXT_PUBLIC_SENTRY_DSN: "",
      SENTRY_AUTH_TOKEN: "",
      DATABASE_URL: "postgres://u:p@localhost/test",
    });
  });

  test("starts an owned app server with notification credentials disabled", () => {
    const server = config.webServer;
    if (!server || Array.isArray(server)) throw new Error("Expected one test app server.");

    expect(server.reuseExistingServer).toBe(false);
    expect(server.env).toMatchObject({
      RESEND_API_KEY: "",
      SENTRY_DSN: "",
      NEXT_PUBLIC_SENTRY_DSN: "",
      SENTRY_AUTH_TOKEN: "",
    });
  });
});
