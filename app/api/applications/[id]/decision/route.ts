import { NextResponse } from "next/server";

import { AuthError, requireAuth, requireRole } from "@/lib/auth-server";
import { UnderwriterDecisionInput } from "@/lib/domain";
import { recordUnderwriterDecision } from "@/lib/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const profile = await requireAuth(request);
    requireRole(profile, "lender");

    const payload = (await request.json()) as UnderwriterDecisionInput;
    const { id } = await context.params;

    await recordUnderwriterDecision(id, payload, profile);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to record decision.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
