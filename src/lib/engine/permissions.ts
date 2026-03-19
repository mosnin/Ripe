import { db } from "@/lib/db";
import { agentPermissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { PermissionConstraints } from "@/lib/types";

interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  constraints?: PermissionConstraints;
}

/**
 * Check if an agent has a specific permission.
 * Returns the result with any applicable constraints.
 */
export async function checkPermission(
  agentId: string,
  requiredPermission: string,
  context?: { amount_cents?: number; category?: string }
): Promise<PermissionCheckResult> {
  const permissions = await db.query.agentPermissions.findMany({
    where: eq(agentPermissions.agentId, agentId),
  });

  // Find a matching permission
  const matching = permissions.find(
    (p) => p.permission === requiredPermission
  );

  if (!matching) {
    return {
      allowed: false,
      reason: `Agent does not have permission: ${requiredPermission}`,
    };
  }

  const constraints = matching.constraints as PermissionConstraints | null;

  // Evaluate constraints if present
  if (constraints && context) {
    if (
      constraints.max_amount_cents !== undefined &&
      context.amount_cents !== undefined &&
      context.amount_cents > constraints.max_amount_cents
    ) {
      return {
        allowed: false,
        reason: `Amount ${context.amount_cents} exceeds permission cap of ${constraints.max_amount_cents} cents`,
        constraints,
      };
    }

    if (
      constraints.allowed_categories &&
      context.category &&
      !constraints.allowed_categories.includes(context.category)
    ) {
      return {
        allowed: false,
        reason: `Category "${context.category}" is not in allowed categories`,
        constraints,
      };
    }
  }

  return { allowed: true, constraints: constraints ?? undefined };
}

/**
 * Grant a permission to an agent.
 */
export async function grantPermission(
  agentId: string,
  permission: string,
  grantedBy: string,
  constraints?: PermissionConstraints
) {
  const [created] = await db
    .insert(agentPermissions)
    .values({
      agentId,
      permission,
      constraints: constraints ?? null,
      grantedBy,
    })
    .returning();

  return created;
}

/**
 * Revoke a specific permission from an agent.
 */
export async function revokePermission(permissionId: string) {
  await db
    .delete(agentPermissions)
    .where(eq(agentPermissions.id, permissionId));
}

/**
 * List all permissions for an agent.
 */
export async function listPermissions(agentId: string) {
  return db.query.agentPermissions.findMany({
    where: eq(agentPermissions.agentId, agentId),
  });
}
