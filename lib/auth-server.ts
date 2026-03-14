import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import { AuthProfile, UserRole } from "@/lib/domain";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthError("Missing access token.", 401);
  }

  return authorization.slice("Bearer ".length);
}

export async function requireAuth(request: Request): Promise<AuthProfile> {
  const accessToken = getBearerToken(request);
  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  if (!supabase || !admin) {
    throw new AuthError("Supabase server configuration is incomplete.", 500);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new AuthError("Invalid or expired session.", 401);
  }

  const { data: initialProfile, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  let profile = initialProfile;

  if (profileError) {
    throw new AuthError("User profile could not be loaded.", 500);
  }

  if (!profile) {
    const inferredRole =
      user.user_metadata?.role === "lender" ? "lender" : "borrower";
    const inferredName =
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      "Platform User";

    const { data: createdProfile, error: createProfileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: inferredName,
          role: inferredRole,
        },
        { onConflict: "id" },
      )
      .select("id, full_name, role")
      .single();

    if (createProfileError || !createdProfile) {
      throw new AuthError("User profile was not found.", 403);
    }

    profile = createdProfile;
  }

  if (!profile) {
    throw new AuthError("User profile was not found.", 403);
  }

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    role: profile.role as UserRole,
  };
}

export function requireRole(profile: AuthProfile, role: UserRole) {
  if (profile.role !== role) {
    throw new AuthError("You do not have access to this resource.", 403);
  }
}
