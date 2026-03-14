import { NextResponse } from "next/server";

import { AuthError, requireAuth } from "@/lib/auth-server";

export async function GET(request: Request) {
  try {
    const profile = await requireAuth(request);
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to load authenticated profile." },
      { status: 500 },
    );
  }
}
