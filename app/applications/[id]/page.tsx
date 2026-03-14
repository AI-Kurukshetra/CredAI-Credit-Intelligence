import { ApplicationDetailView } from "@/components/application-detail-view";

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { id } = await params;

  return <ApplicationDetailView id={id} />;
}
