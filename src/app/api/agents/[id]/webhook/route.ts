import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/agents/[id]/webhook
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id } = await params;

  const agent = await db.query.agents.findFirst({
    where: and(eq(agents.id, id), eq(agents.ownerId, user.id)),
    columns: { webhookUrl: true },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({ webhook_url: agent.webhookUrl ?? null });
}

// PUT /api/agents/[id]/webhook
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id } = await params;

  const agent = await db.query.agents.findFirst({
    where: and(eq(agents.id, id), eq(agents.ownerId, user.id)),
    columns: { id: true },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = await req.json();
  const { webhook_url } = body as { webhook_url: string | null };

  // Validate URL if provided
  if (webhook_url) {
    try {
      const url = new URL(webhook_url);
      if (!["http:", "https:"].includes(url.protocol)) {
        return NextResponse.json(
          { error: "Webhook URL must use HTTP or HTTPS" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }
  }

  await db
    .update(agents)
    .set({ webhookUrl: webhook_url || null, updatedAt: new Date() })
    .where(eq(agents.id, id));

  return NextResponse.json({ webhook_url: webhook_url || null });
}
