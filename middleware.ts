import { clerkMiddleware } from "@clerk/nextjs/server";

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export default clerkMiddleware(
  async (auth, request) => {
    if (isAdminRoute(request.nextUrl.pathname)) {
      await auth.protect();
    }
  },
  {
    contentSecurityPolicy: {
      directives: {
        "base-uri": ["self"],
        "connect-src": [
          "https://*.ingest.sentry.io",
          "https://*.ingest.us.sentry.io",
          "https://*.r2.cloudflarestorage.com",
          ...(process.env.NODE_ENV === "production" ? [] : ["ws:"]),
        ],
        "frame-ancestors": ["none"],
        "img-src": ["blob:", "https:"],
        "object-src": ["none"],
      },
    },
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
