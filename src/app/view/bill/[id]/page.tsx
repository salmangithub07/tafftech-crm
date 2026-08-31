import { Metadata } from "next";
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { query } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PublicBillView } from "@/components/bills/public-bill-view";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) return { title: "Invoice | Tafftech CRM" };

  try {
    const bills = await query(
      `SELECT b.*, COALESCE(b.customer_name, c.name) AS customer_name
       FROM bills b
       LEFT JOIN customers c ON c.id = b.customer_id
       WHERE b.id = ?`,
      [id]
    );

    if (!bills.length) return { title: "Invoice Not Found" };

    const bill = bills[0] as any;
    const settings = await getSettings(bill.tenant_id);
    const company = (settings.site_name || "TAFF TECH").replace(/\bCRM\b/gi, "").trim() || "TAFF TECH";
    const docNo = bill.bill_number || `INV-${bill.id}`;
    const customer = bill.customer_name || "Customer";
    const total = Number(bill.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const dateStr = bill.bill_date ? new Date(bill.bill_date).toLocaleDateString("en-IN") : "";

    const title = `Tax Invoice: ${docNo} — ${company}`;
    const description = `Customer: ${customer} | Total Amount: ₹${total}${dateStr ? ` | Date: ${dateStr}` : ""} — Click to view and download full invoice.`;
    const ogImageUrl = `/api/og/bill/${id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
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
    return { title: "Tax Invoice | Tafftech CRM" };
  }
}

export default async function PublicBillPage({ params }: Props) {
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
      <PublicBillView id={id} />
    </Suspense>
  );
}
