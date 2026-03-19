import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the current authenticated user's database record.
 * Creates a record if it doesn't exist (handles race with webhook).
 */
export async function getOrCreateDbUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (existing) return existing;

  // Webhook hasn't synced yet — create inline
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Unauthorized");

  const [newUser] = await db
    .insert(users)
    .values({
      clerkId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null,
    })
    .onConflictDoNothing({ target: users.clerkId })
    .returning();

  // If onConflictDoNothing returned nothing, the row was created by the webhook
  if (!newUser) {
    const synced = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
    if (!synced) throw new Error("Failed to sync user");
    return synced;
  }

  return newUser;
}

/**
 * Require authentication and return the database user. For use in API routes.
 */
export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return getOrCreateDbUser();
}
