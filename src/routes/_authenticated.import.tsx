import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCurrency } from "@/lib/auth";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseCSV } from "@/lib/csv";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({ meta: [{ title: "Import — LedgerFlow Pro" }] }),
  component: ImportPage,
});

function ImportPage() {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const qc = useQueryClient();
  const [target, setTarget] = useState("ledger_entries");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setRows(parseCSV(String(reader.result ?? "")));
    reader.readAsText(f);
  }

  async function run() {
    if (!user || !rows.length) return;
    setImporting(true);
    let payload: any[] = [];
    if (target === "ledger_entries") {
      payload = rows.map((r) => ({
        user_id: user.id,
        entry_date: r.date || r.entry_date || new Date().toISOString().slice(0,10),
        type: (r.type ?? "expense").toLowerCase() === "income" ? "income" : "expense",
        amount: parseFloat(r.amount ?? "0") || 0,
        tax: parseFloat(r.tax ?? "0") || 0,
        currency: r.currency || currency,
        category: r.category || null,
        description: r.description || null,
        payment_method: r.payment_method || r.method || null,
        reference_number: r.reference || r.reference_number || null,
      }));
    } else if (target === "customers" || target === "vendors") {
      payload = rows.map((r) => ({
        user_id: user.id, name: r.name || "Unnamed",
        email: r.email || null, phone: r.phone || null,
        company: r.company || null, address: r.address || null,
      }));
    }
    const { error } = await (supabase.from(target as any).insert(payload) as any);
    setImporting(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${payload.length} rows`);
    setRows([]);
    qc.invalidateQueries();
  }

  return (
    <>
      <PageHeader title="Import data" description="Bring in your existing CSV records — ledger, customers, or vendors." />
      <div className="surface-card rounded-2xl p-6 space-y-5 max-w-3xl">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Import to</label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ledger_entries">Ledger entries</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="vendors">Vendors</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">CSV file</label>
            <input type="file" accept=".csv,text/csv" onChange={onFile}
              className="mt-1.5 w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-1.5 file:font-medium file:cursor-pointer" />
          </div>
        </div>
        <div className="text-xs text-muted-foreground rounded-lg bg-muted/40 p-3">
          <div className="font-medium text-foreground mb-1">Expected columns</div>
          {target === "ledger_entries" && <span>date, type (income/expense), amount, tax, currency, category, description, payment_method, reference</span>}
          {target === "customers" && <span>name, email, phone, company, address</span>}
          {target === "vendors" && <span>name, email, phone, company, address</span>}
        </div>
        {rows.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 flex items-center gap-1.5"><FileText className="h-4 w-4" /> Preview · {rows.length} rows</div>
            <div className="border border-border rounded-lg overflow-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground"><tr>{Object.keys(rows[0]).map((k) => <th key={k} className="text-left p-2 whitespace-nowrap">{k}</th>)}</tr></thead>
                <tbody>{rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-t border-border">{Object.keys(rows[0]).map((k) => <td key={k} className="p-2 whitespace-nowrap">{r[k]}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
            <Button onClick={run} disabled={importing} className="mt-4 gradient-primary text-white border-0 shadow-glow">
              <Upload className="h-4 w-4 mr-1.5" /> Import {rows.length} rows
            </Button>
          </div>
        )}
        {!rows.length && (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Choose a CSV file above to see a preview before importing.
          </div>
        )}
      </div>
    </>
  );
}