"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useAuth } from "@/components/auth-provider";

export function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: "borrower",
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }
      }

      const authState = await refresh();
      router.push(authState.profile?.role === "lender" ? "/" : "/apply");
      router.refresh();
    });
  };

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex gap-3">
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            mode === "signin"
              ? "bg-slate-950 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
          onClick={() => setMode("signin")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            mode === "signup"
              ? "bg-slate-950 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
          onClick={() => setMode("signup")}
          type="button"
        >
          Borrower sign up
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        {mode === "signup" ? (
          <Field label="Full name" value={fullName} onChange={setFullName} />
        ) : null}
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
        />
      </div>

      <button
        className="mt-6 w-full rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:bg-slate-300"
        disabled={isPending}
        onClick={handleSubmit}
        type="button"
      >
        {isPending
          ? "Processing..."
          : mode === "signup"
            ? "Create borrower account"
            : "Sign in"}
      </button>

      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        Lender access uses the same sign-in form, but lender users should be created in Supabase Auth and assigned the `lender` role in `profiles`.
      </div>

      <p className="mt-4 text-sm text-slate-500">
        After sign in, borrowers can use{" "}
        <Link className="font-semibold text-slate-900" href="/apply">
          /apply
        </Link>{" "}
        and lenders use the main dashboard.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}
