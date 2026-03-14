import { NextResponse } from "next/server";

import { AuthError, requireAuth } from "@/lib/auth-server";
import { getApplicationDetail } from "@/lib/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const profile = await requireAuth(request);
    const { id } = await context.params;
    const detail = await getApplicationDetail(id, profile);

    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to load application detail.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
