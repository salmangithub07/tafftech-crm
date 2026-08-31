import { Metadata } from "next";
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { query } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PublicQuotationView } from "@/components/quotations/public-quotation-view";

import { headers } from "next/headers";

interface Props {
  params: Promise<{ id: string }>;
}

async function getOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    if (host) return `${proto}://${host}`;
  } catch {
    // fallback
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://tafftech-crm.vercel.app")
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) return { title: "Quotation | Tafftech CRM" };

  try {
    const quotations = await query(
      `SELECT q.*, COALESCE(q.customer_name, c.name) AS customer_name
       FROM quotations q
       LEFT JOIN customers c ON c.id = q.customer_id
       WHERE q.id = ?`,
      [id]
    );

    if (!quotations.length) return { title: "Quotation Not Found" };

    const quotation = quotations[0] as any;
    const settings = await getSettings(quotation.tenant_id);
    const company = (settings.site_name || "TAFF TECH").replace(/\bCRM\b/gi, "").trim() || "TAFF TECH";
    const docNo = quotation.quotation_number || `QT-${quotation.id}`;
    const customer = quotation.customer_name || "Customer";
    const total = Number(quotation.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const dateStr = quotation.quotation_date ? new Date(quotation.quotation_date).toLocaleDateString("en-IN") : "";

    const origin = await getOrigin();
    const pageUrl = `${origin}/view/quotation/${id}`;
    const ogImageUrl = `${origin}/api/og/quotation/${id}`;

    const title = `Quotation: ${docNo} — ${company}`;
    const description = `Customer: ${customer} | Total Amount: ₹${total}${dateStr ? ` | Date: ${dateStr}` : ""} — Click to view and download full quotation.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: pageUrl,
        siteName: company,
        type: "website",
        images: [
          {
            url: ogImageUrl,
            secureUrl: ogImageUrl,
            width: 1200,
            height: 630,
            type: "image/png",
            alt: `${company} - ${docNo}`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch {
    return { title: "Quotation | Tafftech CRM" };
  }
}

export default async function PublicQuotationPage({ params }: Props) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <PublicQuotationView id={id} />
    </Suspense>
  );
}
