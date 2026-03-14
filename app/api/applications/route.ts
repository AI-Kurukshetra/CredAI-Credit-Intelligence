import { NextResponse } from "next/server";

import { AuthError, requireAuth, requireRole } from "@/lib/auth-server";
import { LoanApplicationInput } from "@/lib/domain";
import { listBorrowerApplications, submitApplication } from "@/lib/repository";

function isValidInput(payload: LoanApplicationInput) {
  return (
    payload.borrower.firstName.trim().length > 0 &&
    payload.borrower.lastName.trim().length > 0 &&
    payload.borrower.email.trim().length > 0 &&
    payload.agreedToTerms
  );
}

export async function POST(request: Request) {
  try {
    const profile = await requireAuth(request);
    requireRole(profile, "borrower");
    const payload = (await request.json()) as LoanApplicationInput;

    if (!isValidInput(payload)) {
      return NextResponse.json(
        {
          error:
            "Missing borrower profile fields or consent has not been captured.",
        },
        { status: 400 },
      );
    }

    const response = await submitApplication(payload, profile);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Application submission failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const profile = await requireAuth(request);
    requireRole(profile, "borrower");
    const applications = await listBorrowerApplications(profile);
    return NextResponse.json(applications);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to load applications.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
