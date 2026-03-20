import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createAuditLog } from "@/lib/engine/audit";

// POST /api/agents/batch — Bulk status update
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { agent_ids, action } = body as {
      agent_ids: string[];
      action: "suspend" | "reactivate" | "archive";
    };

    if (!Array.isArray(agent_ids) || agent_ids.length === 0) {
      return NextResponse.json({ error: "No agents selected" }, { status: 400 });
    }

    if (!["suspend", "reactivate", "archive"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Verify all agents belong to user
    const userAgents = await db.query.agents.findMany({
      where: and(eq(agents.ownerId, user.id), inArray(agents.id, agent_ids)),
      columns: { id: true, status: true },
    });

    if (userAgents.length !== agent_ids.length) {
      return NextResponse.json(
        { error: "Some agents not found or not owned by you" },
        { status: 403 }
      );
    }

    const statusMap = {
      suspend: "suspended" as const,
      reactivate: "active" as const,
      archive: "archived" as const,
    };

    const newStatus = statusMap[action];

    // Filter out agents already in target status
    const eligible = userAgents.filter((a) => a.status !== newStatus);
    if (eligible.length === 0) {
      return NextResponse.json({
        updated: 0,
        message: "All selected agents are already in the target status",
      });
    }

    const eligibleIds = eligible.map((a) => a.id);

    await db
      .update(agents)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(inArray(agents.id, eligibleIds));

    // Audit
    for (const agentId of eligibleIds) {
      await createAuditLog({
        actorType: "user",
        actorId: user.id,
        action: `agent.${action === "reactivate" ? "reactivated" : action === "suspend" ? "suspended" : "archived"}`,
        resourceType: "agent",
        resourceId: agentId,
        metadata: { source: "batch_operation" },
      });
    }

    return NextResponse.json({ updated: eligibleIds.length });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
