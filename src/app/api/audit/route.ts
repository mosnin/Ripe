import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { auditLogs, agents } from "@/lib/db/schema";
import { eq, or, inArray, desc } from "drizzle-orm";

// GET /api/audit — Get audit logs for the current user and their agents
export async function GET(req: Request) {
  try {
    const user = await requireAuth();

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    // Get all the user's agent IDs
    const userAgents = await db.query.agents.findMany({
      where: eq(agents.ownerId, user.id),
      columns: { id: true, name: true },
    });
    const agentIds = userAgents.map((a) => a.id);

    // Build conditions: logs where actor is the user OR actor is one of their agents
    const conditions = [eq(auditLogs.actorId, user.id)];
    if (agentIds.length > 0) {
      conditions.push(inArray(auditLogs.actorId, agentIds));
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(or(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      logs,
      agents: Object.fromEntries(userAgents.map((a) => [a.id, a.name])),
    });
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
