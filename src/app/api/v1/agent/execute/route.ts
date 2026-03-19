import { NextResponse } from "next/server";
import { executeAction } from "@/lib/engine/gateway";
import { executeActionSchema } from "@/lib/validations";

// POST /api/v1/agent/execute — The execution gateway
// This endpoint uses API key auth, NOT Clerk sessions
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const body = await req.json();

    const parsed = executeActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await executeAction(authHeader, parsed.data);

    const statusCode = result.success
      ? 200
      : result.error?.includes("Rate limit")
        ? 429
        : result.error?.includes("Authentication")
          ? 401
          : result.error?.includes("permission") ||
              result.error?.includes("Insufficient") ||
              result.error?.includes("exceeds") ||
              result.error?.includes("denied") ||
              result.error?.includes("Cooldown") ||
              result.error?.includes("not allowed")
            ? 403
            : 500;

    return NextResponse.json(result, { status: statusCode });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
