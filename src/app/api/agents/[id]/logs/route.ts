import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents, actionRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/agents/[id]/logs — Get action request logs for an agent
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

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const logs = await db.query.actionRequests.findMany({
      where: eq(actionRequests.agentId, id),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
      limit,
      offset,
    });

    return NextResponse.json({ logs });
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
