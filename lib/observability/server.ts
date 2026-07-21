import "server-only";

import * as Sentry from "@sentry/nextjs";

import {
  getServerExceptionTags,
  normalizeServerException,
  type ServerExceptionContext,
} from "@/lib/observability/server-context";

export function captureServerException(error: unknown, context: ServerExceptionContext): string {
  return Sentry.withScope((scope) => {
    scope.setTags(getServerExceptionTags(context));

    return Sentry.captureException(normalizeServerException(error));
  });
}
