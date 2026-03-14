import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Use /api/dashboard instead.",
    },
    { status: 410 },
  );
}
