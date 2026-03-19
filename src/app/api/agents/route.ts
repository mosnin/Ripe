import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents, spendingPolicies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createAgentSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/engine/audit";

// GET /api/agents — List agents for the current user
export async function GET() {
  try {
    const user = await requireAuth();

    const userAgents = await db.query.agents.findMany({
      where: and(
        eq(agents.ownerId, user.id),
        // Don't show archived by default
      ),
      orderBy: (a, { desc }) => [desc(a.createdAt)],
      with: {
        spendingPolicy: true,
      },
    });

    return NextResponse.json({ agents: userAgents });
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

// POST /api/agents — Create a new agent
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = createAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [agent] = await db
      .insert(agents)
      .values({
        ownerId: user.id,
        name: parsed.data.name,
        description: parsed.data.description,
      })
      .returning();

    // Create default spending policy
    await db.insert(spendingPolicies).values({
      agentId: agent.id,
      maxPerTransaction: 10000, // $100 default
      maxDailySpend: 100000, // $1000 default
    });

    await createAuditLog({
      actorType: "user",
      actorId: user.id,
      action: "agent.created",
      resourceType: "agent",
      resourceId: agent.id,
    });

    return NextResponse.json({ agent }, { status: 201 });
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
