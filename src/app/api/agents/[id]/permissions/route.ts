import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/clerk";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  grantPermission,
  revokePermission,
  listPermissions,
} from "@/lib/engine/permissions";
import { grantPermissionSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/engine/audit";

// GET /api/agents/[id]/permissions
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

    const permissions = await listPermissions(id);
    return NextResponse.json({ permissions });
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

// POST /api/agents/[id]/permissions
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const parsed = grantPermissionSchema.safeParse({ ...body, agent_id: id });
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

    const permission = await grantPermission(
      id,
      parsed.data.permission,
      user.id,
      parsed.data.constraints
    );

    await createAuditLog({
      actorType: "user",
      actorId: user.id,
      action: "permission.granted",
      resourceType: "agent_permission",
      resourceId: permission.id,
      metadata: {
        agent_id: id,
        permission: parsed.data.permission,
      },
    });

    return NextResponse.json({ permission }, { status: 201 });
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

// DELETE /api/agents/[id]/permissions?permission_id=xxx
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const url = new URL(req.url);
    const permissionId = url.searchParams.get("permission_id");

    if (!permissionId) {
      return NextResponse.json(
        { error: "Missing permission_id" },
        { status: 400 }
      );
    }

    const agent = await db.query.agents.findFirst({
      where: and(eq(agents.id, id), eq(agents.ownerId, user.id)),
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    await revokePermission(permissionId);

    await createAuditLog({
      actorType: "user",
      actorId: user.id,
      action: "permission.revoked",
      resourceType: "agent_permission",
      resourceId: permissionId,
      metadata: { agent_id: id },
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
