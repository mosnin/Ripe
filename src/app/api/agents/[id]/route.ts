import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateAgentStatusSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/engine/audit";

// GET /api/agents/[id] — Get agent detail
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const agent = await db.query.agents.findFirst({
      where: and(eq(agents.id, id), eq(agents.ownerId, user.id)),
      with: {
        spendingPolicy: true,
        permissions: true,
        apiKeys: {
          columns: {
            id: true,
            keyPrefix: true,
            label: true,
            status: true,
            lastUsedAt: true,
            createdAt: true,
            revokedAt: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ agent });
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

// PATCH /api/agents/[id] — Update agent status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateAgentStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify ownership
    const agent = await db.query.agents.findFirst({
      where: and(eq(agents.id, id), eq(agents.ownerId, user.id)),
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Validate state transitions
    const validTransitions: Record<string, string[]> = {
      active: ["suspended", "archived"],
      suspended: ["active", "archived"],
      archived: [],
    };

    if (!validTransitions[agent.status]?.includes(parsed.data.status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${agent.status}' to '${parsed.data.status}'`,
        },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(agents)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning();

    await createAuditLog({
      actorType: "user",
      actorId: user.id,
      action: `agent.${parsed.data.status}`,
      resourceType: "agent",
      resourceId: id,
    });

    return NextResponse.json({ agent: updated });
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

// DELETE /api/agents/[id] — Archive an agent
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const agent = await db.query.agents.findFirst({
      where: and(eq(agents.id, id), eq(agents.ownerId, user.id)),
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    await db
      .update(agents)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(agents.id, id));

    await createAuditLog({
      actorType: "user",
      actorId: user.id,
      action: "agent.archived",
      resourceType: "agent",
      resourceId: id,
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
