import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/agents(.*)",
  "/wallet(.*)",
  "/activity(.*)",
  "/settings(.*)",
]);

// Routes that must bypass Clerk entirely — external webhooks and agent API key auth
const isPublicApiRoute = createRouteMatcher([
  "/api/webhooks/(.*)",
  "/api/v1/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Never gate webhook or agent-key-auth routes behind Clerk
  if (isPublicApiRoute(req)) {
    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
