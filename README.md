## Credit Intelligence Platform MVP

This repository now contains the first implementation pass for the SRS-defined MVP:

- borrower application portal
- core scoring engine with alternative-data inputs
- simple underwriting workflow and recommendation states
- compliance-ready adverse-action reasoning
- essential lender dashboard reporting
- Supabase schema and Edge Function scaffolding

## Local development

```bash
npm run dev
```

Open `http://localhost:3000` for the lender dashboard and `http://localhost:3000/apply` for the borrower portal.

## Current implementation notes

- The Next.js app uses seeded operational data so the MVP UI works immediately.
- The scoring engine is implemented in shared app logic at `lib/scoring.ts`.
- A matching Supabase Edge Function scaffold exists at `supabase/functions/run-scoring/index.ts`.
- The initial Supabase SQL schema is defined in `supabase/migrations/202603140001_credit_intelligence_mvp.sql`.
- Application submission currently returns a simulated persistence response until the SQL migration is applied and repository methods are wired to live tables.
