import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents, agentApiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateApiKey, revokeApiKey } from "@/lib/auth/agent-auth";
import { createApiKeySchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/engine/audit";

// POST /api/keys — Generate a new API key for an agent
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = createApiKeySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify agent ownership
    const agent = await db.query.agents.findFirst({
      where: and(
        eq(agents.id, parsed.data.agent_id),
        eq(agents.ownerId, user.id)
      ),
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const result = await generateApiKey(agent.id, parsed.data.label);

    await createAuditLog({
      actorType: "user",
      actorId: user.id,
      action: "api_key.created",
      resourceType: "agent_api_key",
      resourceId: result.id,
      metadata: { agent_id: agent.id },
    });

    // This is the ONLY time the raw key is returned
    return NextResponse.json({ key: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/keys?id=xxx — Revoke an API key
export async function DELETE(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const keyId = url.searchParams.get("id");

    if (!keyId) {
      return NextResponse.json(
        { error: "Missing key ID" },
        { status: 400 }
      );
    }

    // Verify ownership chain: key → agent → user
    const key = await db.query.agentApiKeys.findFirst({
      where: eq(agentApiKeys.id, keyId),
      with: { agent: true },
    });

    if (!key || key.agent.ownerId !== user.id) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    await revokeApiKey(keyId);

    await createAuditLog({
      actorType: "user",
      actorId: user.id,
      action: "api_key.revoked",
      resourceType: "agent_api_key",
      resourceId: keyId,
      metadata: { agent_id: key.agentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
