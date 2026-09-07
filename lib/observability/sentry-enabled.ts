/**
 * Shared gate for the client, server, and edge `Sentry.init()` calls.
 *
 * Reporting requires a production Vercel deployment. A local `next build && next start` also
 * uses NODE_ENV=production, so the build mode alone cannot distinguish test runs from the store.
 *
 * `nodeEnv` is passed in rather than read here so the decision stays a pure function of its
 * arguments, and so each caller keeps the build-time `process.env.NODE_ENV` inlining its own
 * bundle performs.
 */
export function isSentryEnabled(
  dsn: string | undefined,
  nodeEnv: string | undefined,
  deploymentEnv: string | undefined,
): boolean {
  return Boolean(dsn) && nodeEnv === "production" && deploymentEnv === "production";
}
