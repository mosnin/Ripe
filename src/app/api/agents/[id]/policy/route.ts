import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents, spendingPolicies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateSpendingPolicySchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/engine/audit";

// GET /api/agents/[id]/policy
export async function GET(
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

    const policy = await db.query.spendingPolicies.findFirst({
      where: eq(spendingPolicies.agentId, id),
    });

    return NextResponse.json({ policy: policy ?? null });
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

// PUT /api/agents/[id]/policy
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const parsed = updateSpendingPolicySchema.safeParse({
      ...body,
      agent_id: id,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const agent = await db.query.agents.findFirst({
      where: and(eq(agents.id, id), eq(agents.ownerId, user.id)),
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const [policy] = await db
      .insert(spendingPolicies)
      .values({
        agentId: id,
        maxPerTransaction: parsed.data.max_per_transaction ?? null,
        maxDailySpend: parsed.data.max_daily_spend ?? null,
        allowedCategories: parsed.data.allowed_categories ?? null,
        requireApprovalAbove: parsed.data.require_approval_above ?? null,
        cooldownSeconds: parsed.data.cooldown_seconds ?? null,
      })
      .onConflictDoUpdate({
        target: spendingPolicies.agentId,
        set: {
          maxPerTransaction: parsed.data.max_per_transaction ?? null,
          maxDailySpend: parsed.data.max_daily_spend ?? null,
          allowedCategories: parsed.data.allowed_categories ?? null,
          requireApprovalAbove: parsed.data.require_approval_above ?? null,
          cooldownSeconds: parsed.data.cooldown_seconds ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    await createAuditLog({
      actorType: "user",
      actorId: user.id,
      action: "spending_policy.updated",
      resourceType: "spending_policy",
      resourceId: policy.id,
      metadata: { agent_id: id },
    });

    return NextResponse.json({ policy });
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
