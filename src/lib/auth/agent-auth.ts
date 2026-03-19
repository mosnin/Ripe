import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { agentApiKeys, agents, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { ApiKeyCreationResult } from "@/lib/types";

const API_KEY_PREFIX = "ripe_ak_";

/**
 * Generate a new API key for an agent.
 * Returns the full key (shown once) and stores only the hash.
 */
export async function generateApiKey(
  agentId: string,
  label: string = "default"
): Promise<ApiKeyCreationResult> {
  const randomPart = randomBytes(32).toString("base64url");
  const rawKey = `${API_KEY_PREFIX}${randomPart}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = randomPart.slice(0, 8);

  const [created] = await db
    .insert(agentApiKeys)
    .values({
      agentId,
      keyPrefix,
      keyHash,
      label,
    })
    .returning();

  return {
    id: created.id,
    key_prefix: keyPrefix,
    raw_key: rawKey, // shown once, never stored
    label,
    created_at: created.createdAt,
  };
}

/**
 * Hash an API key for storage/lookup.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Authenticate an agent via API key.
 * Returns the agent + owner if valid, null otherwise.
 */
export async function authenticateAgent(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7);
  if (!rawKey.startsWith(API_KEY_PREFIX)) return null;

  const keyHash = hashApiKey(rawKey);

  const keyRecord = await db.query.agentApiKeys.findFirst({
    where: and(
      eq(agentApiKeys.keyHash, keyHash),
      eq(agentApiKeys.status, "active")
    ),
  });

  if (!keyRecord) return null;

  // Check expiry
  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) return null;

  // Update last used
  await db
    .update(agentApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(agentApiKeys.id, keyRecord.id));

  // Load agent
  const agent = await db.query.agents.findFirst({
    where: and(eq(agents.id, keyRecord.agentId), eq(agents.status, "active")),
  });

  if (!agent) return null;

  // Load owner
  const owner = await db.query.users.findFirst({
    where: eq(users.id, agent.ownerId),
  });

  if (!owner) return null;

  return { agent, owner, apiKeyId: keyRecord.id };
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(keyId: string) {
  await db
    .update(agentApiKeys)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(eq(agentApiKeys.id, keyId));
}
