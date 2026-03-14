import { AuthenticatedShell } from "@/components/authenticated-shell";
import { BorrowerApplicationsList } from "@/components/borrower-applications-list";

export default function BorrowerApplicationsPage() {
  return (
    <AuthenticatedShell
      allowedRole="borrower"
      description="Track every borrower submission, lender decision, and application status in a dedicated history workspace."
      title="My applications"
    >
      <BorrowerApplicationsList />
    </AuthenticatedShell>
  );
}
