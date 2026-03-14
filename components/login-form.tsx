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
    <div className="rounded-[36px] border border-sky-100 bg-white p-8 shadow-[var(--shadow)] backdrop-blur">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            Secure access
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {mode === "signup" ? "Create borrower account" : "Sign in to CredAI"}
          </h2>
        </div>
        <span className="rounded-full border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          {mode === "signup" ? "Borrower" : "Portal"}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "signin"
              ? "bg-slate-950 text-white"
              : "border border-sky-100 bg-white text-slate-600"
          }`}
          onClick={() => setMode("signin")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "signup"
              ? "bg-slate-950 text-white"
              : "border border-sky-100 bg-white text-slate-600"
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
        className="mt-6 w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
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

      <div className="mt-6 rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] p-5 text-sm leading-6 text-slate-500">
        {mode === "signup"
          ? "Borrower accounts use email and password sign-up. After confirmation, applicants can start a loan request and upload supporting documents."
          : "Lender accounts use the same secure sign-in. Lender users should exist in Supabase Auth and carry the lender role in profiles."}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
        <span>Borrowers land in the intake workspace.</span>
        <span className="hidden h-1 w-1 rounded-full bg-sky-100 sm:block" />
        <Link
          className="font-semibold text-slate-900"
          href="/apply"
        >
          Open borrower flow
        </Link>
      </div>
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
    <label className="grid gap-2 text-sm font-medium text-slate-600">
      <span>{label}</span>
      <input
        className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}
