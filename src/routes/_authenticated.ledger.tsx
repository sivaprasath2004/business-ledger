import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCurrency } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/app/AppShell";
import { LedgerEntryDialog } from "@/components/app/LedgerEntryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, Plus, MoreHorizontal, Search, ArrowUpRight, ArrowDownRight, Trash2, Edit, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { toCSV, downloadFile } from "@/lib/csv";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Entry = Tables<"ledger_entries">;

export const Route = createFileRoute("/_authenticated/ledger")({
  head: () => ({ meta: [{ title: "Ledger — LedgerFlow Pro" }] }),
  component: LedgerPage,
});

function LedgerPage() {
  return <LedgerView title="Ledger Entries" description="Every income and expense in one auditable log." />;
}

export function LedgerView({
  fixedType, title, description,
}: { fixedType?: "income" | "expense"; title: string; description?: string }) {
  const { user } = useAuth();
  const { locale } = useCurrency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(fixedType ?? "all");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["ledger", user?.id, typeFilter],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("ledger_entries").select("*").eq("archived", false).order("entry_date", { ascending: false }).order("created_at", { ascending: false });
      if (typeFilter !== "all") q = q.eq("type", typeFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const filtered = (entries ?? []).filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return [e.description, e.category, e.reference_number, e.ledger_number, e.notes]
      .some((v) => v?.toLowerCase().includes(s));
  });

  const totals = filtered.reduce(
    (a, e) => {
      if (e.type === "income") a.income += Number(e.amount);
      else a.expense += Number(e.amount);
      return a;
    },
    { income: 0, expense: 0 },
  );

  async function archive(id: string) {
    await supabase.from("ledger_entries").update({ archived: true }).eq("id", id);
    toast.success("Entry archived");
    qc.invalidateQueries({ queryKey: ["ledger"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  function exportCSV() {
    if (!filtered.length) return toast.error("Nothing to export");
    const rows = filtered.map((e) => ({
      date: e.entry_date, type: e.type, amount: e.amount, currency: e.currency, tax: e.tax,
      category: e.category ?? "", description: e.description ?? "",
      payment_method: e.payment_method ?? "", reference: e.reference_number ?? "",
      ledger_number: e.ledger_number ?? "", notes: e.notes ?? "",
    }));
    downloadFile(`ledger-${new Date().toISOString().slice(0,10)}.csv`, toCSV(rows));
  }

  return (
    <>
      <PageHeader title={title} description={description} action={
        <>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1.5" /> Export</Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-white border-0 shadow-glow">
            <Plus className="h-4 w-4 mr-1.5" /> New entry
          </Button>
        </>
      } />

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div className="surface-card rounded-xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Income</div>
          <div className="text-xl font-semibold tabular-nums text-income mt-1">+{formatCurrency(totals.income, "USD", locale)}</div>
        </div>
        <div className="surface-card rounded-xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Expense</div>
          <div className="text-xl font-semibold tabular-nums text-expense mt-1">-{formatCurrency(totals.expense, "USD", locale)}</div>
        </div>
        <div className="surface-card rounded-xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Net</div>
          <div className={`text-xl font-semibold tabular-nums mt-1 ${totals.income - totals.expense >= 0 ? "text-income" : "text-expense"}`}>
            {formatCurrency(totals.income - totals.expense, "USD", locale)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, category, reference…" className="pl-9" />
        </div>
        {!fixedType && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income only</SelectItem>
              <SelectItem value="expense">Expense only</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="surface-card rounded-2xl h-64 animate-shimmer" />
      ) : !filtered.length ? (
        <EmptyState icon={BookOpen} title="No entries yet"
          description="Add your first income or expense entry to start tracking."
          action={<Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1.5" /> Add entry</Button>}
        />
      ) : (
        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Method</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(e.entry_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-md grid place-items-center shrink-0 ${e.type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                          {e.type === "income" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{e.description || "—"}</div>
                          {e.reference_number && <div className="text-xs text-muted-foreground">Ref: {e.reference_number}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {e.category ? <Badge variant="secondary" className="font-normal">{e.category}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{e.payment_method ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${e.type === "income" ? "text-income" : "text-expense"}`}>
                      {e.type === "income" ? "+" : "-"}{formatCurrency(e.amount, e.currency, locale)}
                    </td>
                    <td className="px-2 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(e); setOpen(true); }}><Edit className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => archive(e.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Archive</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LedgerEntryDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }} entry={editing} defaultType={fixedType} />
    </>
  );
}