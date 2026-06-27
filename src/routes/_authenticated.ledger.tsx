import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCurrency } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/app/AppShell";
import { LedgerEntryDialog } from "@/components/app/LedgerEntryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  BookOpen, Plus, MoreHorizontal, Search, ArrowUpRight, ArrowDownRight,
  Trash2, Edit, Download, Filter, X, ChevronDown, CalendarRange,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { toCSV, downloadFile } from "@/lib/csv";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Entry = Tables<"ledger_entries">;

// Accept URL search params so dashboard cards can deep-link with pre-applied filters
export const Route = createFileRoute("/_authenticated/ledger")({
  head: () => ({ meta: [{ title: "Ledger — LedgerFlow Pro" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    type: (search.type as string) ?? "",
    from: (search.from as string) ?? "",
    to: (search.to as string) ?? "",
  }),
  component: LedgerPage,
});

function LedgerPage() {
  const search = useSearch({ from: "/_authenticated/ledger" });
  return (
    <LedgerView
      title="Ledger Entries"
      description="Every income and expense in one auditable log."
      initialType={search.type || "all"}
      initialDateFrom={search.from || ""}
      initialDateTo={search.to || ""}
    />
  );
}

// ─── Multi-select filter ────────────────────────────────────────────────────
function MultiSelectFilter({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-1.5 h-9 ${selected.length ? "border-primary text-primary" : ""}`}>
          <Filter className="h-3.5 w-3.5" />{label}
          {selected.length > 0 && <Badge className="bg-primary text-primary-foreground ml-1 h-4 px-1.5 text-[10px]">{selected.length}</Badge>}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2">
        <div className="text-xs font-medium text-muted-foreground mb-2 px-1">{label}</div>
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
              <Checkbox checked={selected.includes(o)} onCheckedChange={() => toggle(o)} />{o}
            </label>
          ))}
        </div>
        {selected.length > 0 && <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => onChange([])}>Clear</Button>}
      </PopoverContent>
    </Popover>
  );
}

function DateRangeFilter({ from, to, onChange }: { from: string; to: string; onChange: (f: string, t: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-1.5 h-9 ${from || to ? "border-primary text-primary" : ""}`}>
          <CalendarRange className="h-3.5 w-3.5" />
          {from || to ? `${from || "…"} → ${to || "…"}` : "Date range"}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3">
        <div><Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={from} onChange={(e) => onChange(e.target.value, to)} className="mt-1" /></div>
        <div><Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={to} onChange={(e) => onChange(from, e.target.value)} className="mt-1" /></div>
        {(from || to) && <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onChange("", "")}>Clear dates</Button>}
      </PopoverContent>
    </Popover>
  );
}

// ─── Exported so Income/Expense sub-pages and PartyView can reuse ──────────
export function LedgerView({
  fixedType, title, description, initialType, initialDateFrom, initialDateTo,
}: {
  fixedType?: "income" | "expense";
  title: string;
  description?: string;
  initialType?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
}) {
  const { user } = useAuth();
  const { locale } = useCurrency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(fixedType ?? initialType ?? "all");
  const [dateFrom, setDateFrom] = useState(initialDateFrom ?? "");
  const [dateTo, setDateTo] = useState(initialDateTo ?? "");
  const [custFilter, setCustFilter] = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState<string[]>([]);
  const [methodFilter, setMethodFilter] = useState<string[]>([]);

  // Sync if dashboard navigates with new params (same component, different search)
  useEffect(() => {
    if (initialType && initialType !== "all") setTypeFilter(initialType);
    if (initialDateFrom) setDateFrom(initialDateFrom);
    if (initialDateTo) setDateTo(initialDateTo);
  }, [initialType, initialDateFrom, initialDateTo]);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["ledger", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("ledger_entries")
        .select("*, customers(name), vendors(name)")
        .eq("archived", false)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers", user?.id],
    queryFn: async () => (await supabase.from("customers").select("id,name").order("name")).data ?? [],
    enabled: !!user,
  });

  const allCategories = useMemo(() =>
    [...new Set((entries ?? []).map((e) => e.category).filter(Boolean))].sort() as string[], [entries]);
  const allMethods = useMemo(() =>
    [...new Set((entries ?? []).map((e) => e.payment_method).filter(Boolean))].sort() as string[], [entries]);
  const customerOptions = useMemo(() => (customers ?? []).map((c: any) => c.name), [customers]);

  const filtered = useMemo(() => {
    return (entries ?? []).filter((e: any) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (dateFrom && e.entry_date < dateFrom) return false;
      if (dateTo && e.entry_date > dateTo) return false;
      if (catFilter.length && !catFilter.includes(e.category)) return false;
      if (methodFilter.length && !methodFilter.includes(e.payment_method)) return false;
      if (custFilter.length) {
        const nm = e.customers?.name ?? e.vendors?.name ?? null;
        if (!nm || !custFilter.includes(nm)) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        if (![e.description, e.category, e.reference_number, e.ledger_number, e.notes]
          .some((v) => v?.toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [entries, typeFilter, dateFrom, dateTo, catFilter, methodFilter, custFilter, search]);

  const totals = useMemo(() => filtered.reduce(
    (a: any, e: any) => { if (e.type === "income") a.income += Number(e.amount); else a.expense += Number(e.amount); return a; },
    { income: 0, expense: 0 }
  ), [filtered]);

  const activeFilters = [...(dateFrom || dateTo ? ["date"] : []), ...custFilter, ...catFilter, ...methodFilter];

  async function archive(id: string) {
    await supabase.from("ledger_entries").update({ archived: true }).eq("id", id);
    toast.success("Entry archived");
    qc.invalidateQueries({ queryKey: ["ledger"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  function exportCSV() {
    if (!filtered.length) return toast.error("Nothing to export");
    const rows = filtered.map((e: any) => ({
      date: e.entry_date, type: e.type, amount: e.amount, currency: e.currency, tax: e.tax,
      category: e.category ?? "", description: e.description ?? "",
      payment_method: e.payment_method ?? "", reference: e.reference_number ?? "",
      customer: e.customers?.name ?? e.vendors?.name ?? "",
    }));
    downloadFile(`ledger-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  }

  function clearAllFilters() {
    setDateFrom(""); setDateTo("");
    setCustFilter([]); setCatFilter([]); setMethodFilter([]);
    setSearch("");
    if (!fixedType) setTypeFilter("all");
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

      {/* Summary cards */}
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

      {/* Active filter banner — show when navigated from dashboard */}
      {(dateFrom || dateTo || (typeFilter !== "all" && !fixedType)) && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20 text-sm">
          <Filter className="h-3.5 w-3.5 text-primary" />
          <span className="text-primary font-medium">Filtered view</span>
          {typeFilter !== "all" && <Badge variant="secondary" className="capitalize">{typeFilter}</Badge>}
          {dateFrom && <Badge variant="secondary">{dateFrom} → {dateTo || "today"}</Badge>}
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={clearAllFilters}>
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, category, reference…" className="pl-9 h-9" />
        </div>
        {!fixedType && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income only</SelectItem>
              <SelectItem value="expense">Expense only</SelectItem>
            </SelectContent>
          </Select>
        )}
        <DateRangeFilter from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
        <MultiSelectFilter label="Customer" options={customerOptions} selected={custFilter} onChange={setCustFilter} />
        <MultiSelectFilter label="Category" options={allCategories} selected={catFilter} onChange={setCatFilter} />
        <MultiSelectFilter label="Payment" options={allMethods} selected={methodFilter} onChange={setMethodFilter} />
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(dateFrom || dateTo) && (
            <Badge variant="secondary" className="gap-1.5 pr-1.5">
              <CalendarRange className="h-3 w-3" />{dateFrom || "…"} → {dateTo || "…"}
              <button onClick={() => { setDateFrom(""); setDateTo(""); }}><X className="h-3 w-3 hover:text-destructive" /></button>
            </Badge>
          )}
          {custFilter.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1.5 pr-1.5">{c}
              <button onClick={() => setCustFilter(custFilter.filter((x) => x !== c))}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {catFilter.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1.5 pr-1.5">{c}
              <button onClick={() => setCatFilter(catFilter.filter((x) => x !== c))}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {methodFilter.map((m) => (
            <Badge key={m} variant="secondary" className="gap-1.5 pr-1.5">{m}
              <button onClick={() => setMethodFilter(methodFilter.filter((x) => x !== m))}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAllFilters}>Clear all</Button>
        </div>
      )}

      <div className="text-xs text-muted-foreground mb-2">
        {filtered.length} {filtered.length === 1 ? "entry" : "entries"}{activeFilters.length || search ? " (filtered)" : ""}
      </div>

      {isLoading ? (
        <div className="surface-card rounded-2xl h-64 animate-shimmer" />
      ) : !filtered.length ? (
        <EmptyState icon={BookOpen} title="No entries found"
          description={activeFilters.length || search ? "Try adjusting your filters." : "Add your first income or expense entry."}
          action={!activeFilters.length && !search ? (
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-white border-0">
              <Plus className="h-4 w-4 mr-1.5" /> Add entry
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Customer / Vendor</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Method</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e: any) => (
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
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground">{e.customers?.name ?? e.vendors?.name ?? "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {e.category ? <Badge variant="secondary" className="font-normal">{e.category}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{e.payment_method ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${e.type === "income" ? "text-income" : "text-expense"}`}>
                      {e.type === "income" ? "+" : "-"}{formatCurrency(e.amount, e.currency, locale)}
                    </td>
                    <td className="px-2 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
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

      <LedgerEntryDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}
        entry={editing}
        defaultType={fixedType}
      />
    </>
  );
}
