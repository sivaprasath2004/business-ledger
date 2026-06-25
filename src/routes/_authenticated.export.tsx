import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, Users, Truck, BookOpen, Calendar } from "lucide-react";
import { toCSV, downloadFile } from "@/lib/csv";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/export")({
  head: () => ({ meta: [{ title: "Export — LedgerFlow Pro" }] }),
  component: ExportPage,
});

const EXPORTS = [
  { table: "ledger_entries", label: "Ledger entries", icon: BookOpen, desc: "All income + expenses with categories and references." },
  { table: "invoices", label: "Invoices", icon: FileText, desc: "Invoice register with totals, status, and dates." },
  { table: "customers", label: "Customers", icon: Users, desc: "Customer contact records." },
  { table: "vendors", label: "Vendors", icon: Truck, desc: "Vendor contact records." },
  { table: "calendar_events", label: "Calendar events", icon: Calendar, desc: "All events, tasks, and reminders." },
] as const;

function ExportPage() {
  const [busy, setBusy] = useState<string | null>(null);

  async function go(table: string, format: "csv" | "json") {
    setBusy(table + format);
    const { data, error } = await supabase.from(table as any).select("*");
    setBusy(null);
    if (error) return toast.error(error.message);
    if (!data?.length) return toast.error("Nothing to export");
    const date = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      downloadFile(`${table}-${date}.csv`, toCSV(data as any));
    } else {
      downloadFile(`${table}-${date}.json`, JSON.stringify(data, null, 2), "application/json");
    }
    toast.success(`${data.length} rows exported`);
  }

  return (
    <>
      <PageHeader title="Export data" description="Download your records as CSV or JSON — yours to keep, always." />
      <div className="grid sm:grid-cols-2 gap-3 max-w-3xl">
        {EXPORTS.map((x) => (
          <div key={x.table} className="surface-card rounded-2xl p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><x.icon className="h-5 w-5" /></div>
            </div>
            <div className="font-semibold">{x.label}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{x.desc}</div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={busy === x.table + "csv"} onClick={() => go(x.table, "csv")}>
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" disabled={busy === x.table + "json"} onClick={() => go(x.table, "json")}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> JSON
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}