import { getSession } from "@/lib/auth";
import { PublicDocsClient } from "@/components/docs/public-docs-client";

export const metadata = {
  title: "Taff Desk CRM — Official Documentation & Knowledge Base",
  description: "Public documentation, user manual, module guides, role permissions, and FAQs for Taff Desk CRM.",
};

export default async function PublicDocsPage() {
  const session = await getSession();
  return <PublicDocsClient session={session} />;
}
