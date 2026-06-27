import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCurrency } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users, Truck, Plus, MoreHorizontal, Search, Trash2, Edit, Mail, Phone,
  Building2, ArrowLeft, ArrowUpRight, ArrowDownRight, CalendarRange,
  Filter, ChevronDown, BookOpen, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";

type Table = "customers" | "vendors";

// ─── Multi-select filter ───────────────────────────────────────────────────
function MultiSelectFilter({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
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
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {options.length ? options.map((o) => (
            <label key={o} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
              <Checkbox checked={selected.includes(o)} onCheckedChange={() => toggle(o)} />{o}
            </label>
          )) : <div className="text-sm text-muted-foreground px-2 py-2">No options</div>}
        </div>
        {selected.length > 0 && <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => onChange([])}>Clear</Button>}
      </PopoverContent>
    </Popover>
  );
}

// ─── Party Detail View ─────────────────────────────────────────────────────
function PartyDetail({ party, table, onBack }: { party: any; table: Table; onBack: () => void }) {
  const { locale } = useCurrency();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [catFilter, setCatFilter] = useState<string[]>([]);
  const [methodFilter, setMethodFilter] = useState<string[]>([]);

  const { data: ledgerEntries } = useQuery({
    queryKey: ["party-ledger", party.id, table],
    queryFn: async () => {
      const field = table === "customers" ? "customer_id" : "vendor_id";
      const { data } = await supabase.from("ledger_entries").select("*")
        .eq(field, party.id).eq("archived", false)
        .order("entry_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["party-invoices", party.id],
    enabled: table === "customers",
    queryFn: async () => (await supabase.from("invoices").select("*").eq("customer_id", party.id).order("issue_date", { ascending: false })).data ?? [],
  });

  const allCategories = useMemo(() =>
    [...new Set((ledgerEntries ?? []).map((e: any) => e.category).filter(Boolean))].sort() as string[], [ledgerEntries]);
  const allMethods = useMemo(() =>
    [...new Set((ledgerEntries ?? []).map((e: any) => e.payment_method).filter(Boolean))].sort() as string[], [ledgerEntries]);

  const filteredEntries = useMemo(() => (ledgerEntries ?? []).filter((e: any) => {
    if (dateFrom && e.entry_date < dateFrom) return false;
    if (dateTo && e.entry_date > dateTo) return false;
    if (catFilter.length && !catFilter.includes(e.category)) return false;
    if (methodFilter.length && !methodFilter.includes(e.payment_method)) return false;
    return true;
  }), [ledgerEntries, dateFrom, dateTo, catFilter, methodFilter]);

  const totals = useMemo(() => filteredEntries.reduce(
    (a: any, e: any) => { if (e.type === "income") a.income += Number(e.amount); else a.expense += Number(e.amount); return a; },
    { income: 0, expense: 0 }
  ), [filteredEntries]);

  const invoiceTotals = useMemo(() => (invoices ?? []).reduce(
    (a: any, inv: any) => ({ total: a.total + Number(inv.total), paid: a.paid + (inv.status === "paid" ? Number(inv.total) : 0) }),
    { total: 0, paid: 0 }
  ), [invoices]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="h-10 w-10 rounded-xl gradient-primary text-white grid place-items-center text-sm font-bold shadow-soft shrink-0">
          {party.name.split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold">{party.name}</h1>
          {party.company && <div className="text-sm text-muted-foreground">{party.company}</div>}
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          {party.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{party.email}</span>}
          {party.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{party.phone}</span>}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-4 gap-3 mb-5">
        <div className="surface-card rounded-xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Income</div>
          <div className="text-lg font-semibold tabular-nums text-income mt-1">+{formatCurrency(totals.income, "USD", locale)}</div>
        </div>
        <div className="surface-card rounded-xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Expense</div>
          <div className="text-lg font-semibold tabular-nums text-expense mt-1">-{formatCurrency(totals.expense, "USD", locale)}</div>
        </div>
        {table === "customers" && <>
          <div className="surface-card rounded-xl p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Invoiced</div>
            <div className="text-lg font-semibold tabular-nums mt-1">{formatCurrency(invoiceTotals.total, "USD", locale)}</div>
          </div>
          <div className="surface-card rounded-xl p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Inv. Paid</div>
            <div className="text-lg font-semibold tabular-nums text-income mt-1">{formatCurrency(invoiceTotals.paid, "USD", locale)}</div>
          </div>
        </>}
        {table === "vendors" && (
          <div className="surface-card rounded-xl p-4 sm:col-span-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Net</div>
            <div className={`text-lg font-semibold tabular-nums mt-1 ${totals.income - totals.expense >= 0 ? "text-income" : "text-expense"}`}>
              {formatCurrency(totals.income - totals.expense, "USD", locale)}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={`gap-1.5 h-9 ${dateFrom || dateTo ? "border-primary text-primary" : ""}`}>
              <CalendarRange className="h-3.5 w-3.5" />
              {dateFrom || dateTo ? `${dateFrom || "…"} → ${dateTo || "…"}` : "Date range"}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-3">
            <div><Label className="text-xs text-muted-foreground">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" /></div>
            {(dateFrom || dateTo) && <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>}
          </PopoverContent>
        </Popover>
        <MultiSelectFilter label="Category" options={allCategories} selected={catFilter} onChange={setCatFilter} />
        <MultiSelectFilter label="Payment" options={allMethods} selected={methodFilter} onChange={setMethodFilter} />
      </div>

      {/* Ledger entries */}
      <div className="mb-2 font-semibold text-sm text-muted-foreground uppercase tracking-wider text-xs">Ledger Entries ({filteredEntries.length})</div>
      {!filteredEntries.length ? (
        <div className="surface-card rounded-xl py-8 text-center text-muted-foreground text-sm mb-6">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />No ledger entries found
        </div>
      ) : (
        <div className="surface-card rounded-2xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Method</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e: any) => (
                  <tr key={e.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(e.entry_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-6 rounded-md grid place-items-center shrink-0 ${e.type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                          {e.type === "income" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        </div>
                        <div>
                          <div className="font-medium">{e.description || "—"}</div>
                          {e.reference_number && <div className="text-xs text-muted-foreground">Ref: {e.reference_number}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {e.category ? <Badge variant="secondary" className="font-normal text-xs">{e.category}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{e.payment_method ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${e.type === "income" ? "text-income" : "text-expense"}`}>
                      {e.type === "income" ? "+" : "-"}{formatCurrency(e.amount, e.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {table === "customers" && (
        <>
          <div className="mb-2 font-semibold text-sm text-muted-foreground uppercase tracking-wider text-xs">Invoices ({invoices?.length ?? 0})</div>
          {!invoices?.length ? (
            <div className="surface-card rounded-xl py-8 text-center text-muted-foreground text-sm">No invoices yet</div>
          ) : (
            <div className="surface-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                      <th className="text-left px-4 py-3 font-medium">Issued</th>
                      <th className="text-left px-4 py-3 font-medium">Due</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} className="border-t border-border hover:bg-accent/30">
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.invoice_number}</td>
                        <td className="px-4 py-3">{formatDate(inv.issue_date)}</td>
                        <td className="px-4 py-3">{inv.due_date ? formatDate(inv.due_date) : "—"}</td>
                        <td className="px-4 py-3"><Badge variant="secondary" className="capitalize text-xs">{inv.status}</Badge></td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(inv.total, inv.currency, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Single tab's party list ───────────────────────────────────────────────
function PartyList({
  table, kind, onSelect,
}: { table: Table; kind: "Customer" | "Vendor"; onSelect: (p: any) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: [table, user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from(table).select("*").order("name")).data ?? [],
  });

  const filtered = (items ?? []).filter((c: any) =>
    !search || [c.name, c.email, c.phone, c.company].some((v: any) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  async function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await supabase.from(table).delete().eq("id", id);
    toast.success(`${kind} deleted`);
    qc.invalidateQueries({ queryKey: [table] });
  }

  const icon = table === "customers" ? Users : Truck;

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${kind.toLowerCase()}s…`} className="pl-9" />
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-white border-0 shadow-glow ml-auto">
          <Plus className="h-4 w-4 mr-1.5" /> New {kind.toLowerCase()}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="surface-card rounded-2xl h-32 animate-shimmer" />)}
        </div>
      ) : !filtered.length ? (
        <EmptyState icon={icon} title={`No ${kind.toLowerCase()}s yet`}
          description={search ? "No matches found." : `Add your first ${kind.toLowerCase()} to link them to entries and invoices.`}
          action={!search ? <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1.5" /> Add {kind.toLowerCase()}</Button> : undefined}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c: any) => (
            <div
              key={c.id}
              className="surface-card rounded-2xl p-5 hover:shadow-lifted transition-all group cursor-pointer border border-transparent hover:border-primary/20"
              onClick={() => onSelect(c)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`h-10 w-10 rounded-xl text-white grid place-items-center text-sm font-bold shadow-soft shrink-0 ${table === "customers" ? "gradient-primary" : "bg-amber-500"}`}>
                  {c.name.split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase()}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditing(c); setOpen(true); }}><Edit className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={(e) => remove(c.id, e)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="font-semibold truncate">{c.name}</div>
              {c.company && <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate"><Building2 className="h-3 w-3 shrink-0" />{c.company}</div>}
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{c.email}</span></div>}
                {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" />{c.phone}</div>}
              </div>
              <div className="mt-3 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                View ledger history <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      <PartyDialog table={table} kind={kind} open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }} editing={editing} />
    </>
  );
}

// ─── Unified Customer || Vendor tab view (main export) ─────────────────────
export function CustomersVendorsView({ defaultTab = "customers" }: { defaultTab?: "customers" | "vendors" }) {
  const [tab, setTab] = useState<Table>(defaultTab as Table);
  const [selected, setSelected] = useState<any>(null);

  // If URL changes (vendors route vs customers route), reset
  useEffect(() => { setTab(defaultTab as Table); setSelected(null); }, [defaultTab]);

  if (selected) {
    return <PartyDetail party={selected} table={tab} onBack={() => setSelected(null)} />;
  }

  return (
    <>
      <PageHeader
        title="Customers & Vendors"
        description="Your clients and suppliers — click any card to see their full history."
      />

      {/* Tab switcher */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-muted/40 rounded-xl w-fit border border-border">
        <button
          onClick={() => { setTab("customers"); setSelected(null); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "customers"
              ? "bg-background shadow-sm text-foreground border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Customers
        </button>
        <button
          onClick={() => { setTab("vendors"); setSelected(null); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "vendors"
              ? "bg-background shadow-sm text-foreground border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Truck className="h-4 w-4" />
          Vendors
        </button>
      </div>

      {/* List for active tab */}
      <PartyList
        key={tab}
        table={tab}
        kind={tab === "customers" ? "Customer" : "Vendor"}
        onSelect={setSelected}
      />
    </>
  );
}

// ─── Legacy named export so income/expense routes still compile ────────────
export function PartyView({
  table, kind, title, description,
}: { table: Table; kind: "Customer" | "Vendor"; title: string; description: string }) {
  return <CustomersVendorsView defaultTab={table} />;
}

// ─── Party add/edit dialog ─────────────────────────────────────────────────
function PartyDialog({ table, kind, open, onOpenChange, editing }: {
  table: Table; kind: string; open: boolean; onOpenChange: (v: boolean) => void; editing: any;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", address: "", notes: "", tax_id: "" });

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, email: editing.email ?? "", phone: editing.phone ?? "", company: editing.company ?? "", address: editing.address ?? "", notes: editing.notes ?? "", tax_id: editing.tax_id ?? "" });
    } else {
      setForm({ name: "", email: "", phone: "", company: "", address: "", notes: "", tax_id: "" });
    }
  }, [editing, open]);

  async function save() {
    if (!user || !form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      company: form.company || null,
      address: form.address || null,
      notes: form.notes || null,
      tax_id: form.tax_id || null,
    };
    const { error } = editing
      ? await supabase.from(table).update(payload).eq("id", editing.id)
      : await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? `${kind} updated` : `${kind} added`);
    qc.invalidateQueries({ queryKey: [table] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${kind}` : `New ${kind}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label>Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={`${kind} name`} autoFocus /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>GSTIN / Tax ID</Label><Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
          </div>
          <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Save ${kind}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
