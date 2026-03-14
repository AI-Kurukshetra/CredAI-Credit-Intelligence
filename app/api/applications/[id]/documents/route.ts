import { NextResponse } from "next/server";

import { AuthError, requireAuth, requireRole } from "@/lib/auth-server";
import { uploadApplicationDocument } from "@/lib/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const profile = await requireAuth(request);
    requireRole(profile, "borrower");

    const { id } = await context.params;
    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one file is required." },
        { status: 400 },
      );
    }

    for (const file of files) {
      await uploadApplicationDocument(id, file, profile);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to upload documents.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
