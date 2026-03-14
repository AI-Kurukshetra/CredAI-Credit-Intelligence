import { NextResponse } from "next/server";

import { AuthError, requireAuth, requireRole } from "@/lib/auth-server";
import { getDashboardSnapshot } from "@/lib/repository";

export async function GET(request: Request) {
  try {
    const profile = await requireAuth(request);
    requireRole(profile, "lender");

    const snapshot = await getDashboardSnapshot(profile);
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to load dashboard.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
