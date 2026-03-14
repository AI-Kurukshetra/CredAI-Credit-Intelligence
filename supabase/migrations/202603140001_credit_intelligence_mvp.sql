create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('borrower', 'lender');
  end if;
end
$$;

alter type public.app_role add value if not exists 'borrower';
alter type public.app_role add value if not exists 'lender';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'application_status') then
    create type public.application_status as enum (
      'submitted',
      'scored',
      'review',
      'approved',
      'declined'
    );
  end if;
end
$$;

alter type public.application_status add value if not exists 'submitted';
alter type public.application_status add value if not exists 'scored';
alter type public.application_status add value if not exists 'review';
alter type public.application_status add value if not exists 'approved';
alter type public.application_status add value if not exists 'declined';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'recommendation') then
    create type public.recommendation as enum ('approve', 'review', 'decline');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'policy_outcome') then
    create type public.policy_outcome as enum (
      'auto_approve',
      'manual_review',
      'auto_decline'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'underwriter_action') then
    create type public.underwriter_action as enum (
      'approve',
      'decline',
      'request_information'
    );
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'borrower',
  created_at timestamptz not null default now()
);

create table if not exists public.borrowers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  phone text,
  consent_captured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.score_models (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  version text not null,
  is_active boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.borrowers(id) on delete cascade,
  requested_amount numeric(12,2) not null,
  annual_income numeric(12,2) not null,
  existing_monthly_debt numeric(12,2) not null,
  monthly_housing_payment numeric(12,2) not null,
  employment_years numeric(6,2) not null,
  application_status public.application_status not null default 'submitted',
  submitted_at timestamptz not null default now()
);

create table if not exists public.alternative_data_inputs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.loan_applications(id) on delete cascade,
  income_consistency_score integer not null check (income_consistency_score between 0 and 100),
  average_monthly_balance numeric(12,2) not null,
  rent_on_time_rate integer not null check (rent_on_time_rate between 0 and 100),
  utility_on_time_rate integer not null check (utility_on_time_rate between 0 and 100),
  nsf_events_last_90_days integer not null default 0 check (nsf_events_last_90_days >= 0),
  has_government_id boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.loan_applications(id) on delete cascade,
  storage_bucket text not null default 'application-documents',
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.scoring_runs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.loan_applications(id) on delete cascade,
  model_id uuid not null references public.score_models(id) on delete restrict,
  model_version text not null,
  score integer not null,
  normalized_score numeric(6,3) not null,
  risk_band text not null,
  recommendation public.recommendation not null,
  policy_outcome public.policy_outcome not null,
  summary text not null,
  factors jsonb not null default '[]'::jsonb,
  adverse_action_reasons jsonb not null default '[]'::jsonb,
  scored_at timestamptz not null default now()
);

create table if not exists public.underwriting_decisions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.loan_applications(id) on delete cascade,
  scoring_run_id uuid references public.scoring_runs(id) on delete set null,
  action public.underwriter_action not null,
  final_recommendation public.recommendation,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  review_notes text,
  decided_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.loan_applications(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_loan_applications_borrower_id
  on public.loan_applications(borrower_id);

create index if not exists idx_loan_applications_status
  on public.loan_applications(application_status);

create index if not exists idx_scoring_runs_application_id
  on public.scoring_runs(application_id, scored_at desc);

create index if not exists idx_documents_application_id
  on public.documents(application_id, uploaded_at desc);

create index if not exists idx_underwriting_decisions_application_id
  on public.underwriting_decisions(application_id, decided_at desc);

create index if not exists idx_audit_logs_application_id
  on public.audit_logs(application_id, created_at asc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data->>'role' = 'lender' then 'lender'::public.app_role
      else 'borrower'::public.app_role
    end
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, full_name, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  case
    when u.raw_user_meta_data->>'role' = 'lender' then 'lender'::public.app_role
    else 'borrower'::public.app_role
  end
from auth.users u
on conflict (id) do update
set
  full_name = excluded.full_name,
  role = excluded.role;

insert into public.score_models (name, version, is_active, config)
values (
  'credit_logistic_regression',
  '1.0.0',
  true,
  jsonb_build_object(
    'model_name', 'credit_logistic_regression',
    'version', '1.0.0',
    'intercept', 0.02237872819777879,
    'features',
    jsonb_build_array(
      'requested_amount',
      'annual_income',
      'existing_monthly_debt',
      'housing_payment',
      'employment_years',
      'income_consistency',
      'avg_balance',
      'rent_history',
      'utility_history',
      'nsf_events',
      'identity'
    ),
    'coefficients',
    jsonb_build_array(
      -4.1554290000339866e-05,
      -1.796515655652663e-05,
      -0.0020381365043946136,
      -5.859702522299641e-05,
      0.10380535632359005,
      0.005265096464925986,
      -0.00023216453540973164,
      -0.0003627040544353984,
      0.012738696428329062,
      0.0676910761056696,
      -0.027191200338037107
    )
  )
)
on conflict (name) do update
set
  version = excluded.version,
  is_active = excluded.is_active,
  config = excluded.config;

insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.borrowers enable row level security;
alter table public.loan_applications enable row level security;
alter table public.alternative_data_inputs enable row level security;
alter table public.documents enable row level security;
alter table public.scoring_runs enable row level security;
alter table public.underwriting_decisions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "borrowers_self_read" on public.borrowers;
create policy "borrowers_self_read"
on public.borrowers
for select
using (profile_id = auth.uid());

drop policy if exists "borrowers_self_write" on public.borrowers;
create policy "borrowers_self_write"
on public.borrowers
for all
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "loan_applications_borrower_access" on public.loan_applications;
create policy "loan_applications_borrower_access"
on public.loan_applications
for select
using (
  borrower_id in (
    select id from public.borrowers where profile_id = auth.uid()
  )
);

drop policy if exists "alternative_data_borrower_access" on public.alternative_data_inputs;
create policy "alternative_data_borrower_access"
on public.alternative_data_inputs
for select
using (
  application_id in (
    select la.id
    from public.loan_applications la
    join public.borrowers b on b.id = la.borrower_id
    where b.profile_id = auth.uid()
  )
);

drop policy if exists "scoring_runs_borrower_access" on public.scoring_runs;
create policy "scoring_runs_borrower_access"
on public.scoring_runs
for select
using (
  application_id in (
    select la.id
    from public.loan_applications la
    join public.borrowers b on b.id = la.borrower_id
    where b.profile_id = auth.uid()
  )
);

drop policy if exists "documents_borrower_access" on public.documents;
create policy "documents_borrower_access"
on public.documents
for select
using (
  application_id in (
    select la.id
    from public.loan_applications la
    join public.borrowers b on b.id = la.borrower_id
    where b.profile_id = auth.uid()
  )
);

drop policy if exists "underwriting_decisions_borrower_access" on public.underwriting_decisions;
create policy "underwriting_decisions_borrower_access"
on public.underwriting_decisions
for select
using (
  application_id in (
    select la.id
    from public.loan_applications la
    join public.borrowers b on b.id = la.borrower_id
    where b.profile_id = auth.uid()
  )
);

drop policy if exists "audit_logs_borrower_access" on public.audit_logs;
create policy "audit_logs_borrower_access"
on public.audit_logs
for select
using (
  application_id in (
    select la.id
    from public.loan_applications la
    join public.borrowers b on b.id = la.borrower_id
    where b.profile_id = auth.uid()
  )
);
