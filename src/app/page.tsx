import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LandingPageClient } from "@/components/landing-page-client";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "super_admin" ? "/admins" : "/dashboard");
  }

  return <LandingPageClient />;
}
