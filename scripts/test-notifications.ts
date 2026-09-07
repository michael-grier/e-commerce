/** Empty values keep Next.js and Bun from restoring notification credentials from env files. */
export const testNotificationEnvironment = {
  RESEND_API_KEY: "",
  SENTRY_DSN: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
  SENTRY_AUTH_TOKEN: "",
};

/** Disables external email and error reporting in test runners and their child processes. */
export function disableTestNotifications(environment: NodeJS.ProcessEnv = process.env): void {
  Object.assign(environment, testNotificationEnvironment);
}
