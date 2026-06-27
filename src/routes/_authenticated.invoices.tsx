import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  FileText, Plus, MoreHorizontal, Trash2, Edit, CheckCircle2, X,
  Printer, Download, Filter, ChevronDown, CalendarRange, Search,
} from "lucide-react";
import { formatCurrency, formatDate, toISODate } from "@/lib/format";
import { toast } from "sonner";

const STATUS = ["draft", "sent", "paid", "overdue", "cancelled"] as const;
const statusStyle: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  paid: "bg-income/10 text-income",
  overdue: "bg-expense/10 text-expense",
  cancelled: "bg-muted text-muted-foreground line-through",
};
const CATEGORIES = ["Sales", "Services", "Consulting", "Subscription", "Project", "Retainer", "Other"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Credit Card", "UPI", "Wire", "Check", "Other"];

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices — LedgerFlow Pro" }] }),
  component: Invoices,
});

// ─── Multi select filter ───────────────────────────────────────────────────
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

// ─── Main component ────────────────────────────────────────────────────────
function Invoices() {
  const { user } = useAuth();
  const { currency, locale } = useCurrency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [previewing, setPreviewing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [custFilter, setCustFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("invoices").select("*").order("issue_date", { ascending: false })).data ?? [],
  });

  const customerNames = useMemo(() =>
    [...new Set((invoices ?? []).map((inv: any) => inv.customer_name).filter(Boolean))].sort() as string[],
    [invoices]
  );

  const filtered = useMemo(() => (invoices ?? []).filter((inv: any) => {
    if (statusFilter.length && !statusFilter.includes(inv.status)) return false;
    if (custFilter.length && !custFilter.includes(inv.customer_name)) return false;
    if (dateFrom && inv.issue_date < dateFrom) return false;
    if (dateTo && inv.issue_date > dateTo) return false;
    if (search) {
      const s = search.toLowerCase();
      if (![inv.invoice_number, inv.customer_name, inv.notes].some((v: any) => v?.toLowerCase().includes(s))) return false;
    }
    return true;
  }), [invoices, statusFilter, custFilter, dateFrom, dateTo, search]);

  const totals = useMemo(() => filtered.reduce(
    (a: any, inv: any) => ({
      total: a.total + Number(inv.total),
      paid: a.paid + (inv.status === "paid" ? Number(inv.total) : 0),
      outstanding: a.outstanding + (["sent", "overdue"].includes(inv.status) ? Number(inv.total) : 0),
    }), { total: 0, paid: 0, outstanding: 0 }
  ), [filtered]);

  async function markPaid(inv: any) {
    await supabase.from("invoices").update({ status: "paid", amount_paid: inv.total }).eq("id", inv.id);
    toast.success(`Invoice ${inv.invoice_number} marked paid`);
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }
  async function remove(id: string) {
    await supabase.from("invoices").delete().eq("id", id);
    toast.success("Invoice deleted");
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }

  function exportCSV() {
    if (!filtered.length) return toast.error("Nothing to export");
    const rows = filtered.map((inv: any) => ({
      invoice_number: inv.invoice_number, customer: inv.customer_name ?? "",
      issue_date: inv.issue_date, due_date: inv.due_date ?? "", status: inv.status,
      subtotal: inv.subtotal, tax: inv.tax, discount: inv.discount,
      total: inv.total, amount_paid: inv.amount_paid, currency: inv.currency,
    }));
    const headers = Object.keys(rows[0]).join(",");
    const body = rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <>
      <PageHeader title="Invoices" description="Issue, track, and chase payment on every invoice." action={
        <>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1.5" /> Export CSV</Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-white border-0 shadow-glow">
            <Plus className="h-4 w-4 mr-1.5" /> New invoice
          </Button>
        </>
      } />

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div className="surface-card rounded-xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Invoiced</div>
          <div className="text-xl font-semibold tabular-nums mt-1">{formatCurrency(totals.total, currency, locale)}</div>
        </div>
        <div className="surface-card rounded-xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Paid</div>
          <div className="text-xl font-semibold tabular-nums text-income mt-1">{formatCurrency(totals.paid, currency, locale)}</div>
        </div>
        <div className="surface-card rounded-xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</div>
          <div className="text-xl font-semibold tabular-nums text-expense mt-1">{formatCurrency(totals.outstanding, currency, locale)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice #, customer…" className="pl-9 h-9" />
        </div>
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
            {(dateFrom || dateTo) && <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear dates</Button>}
          </PopoverContent>
        </Popover>
        <MultiSelectFilter label="Customer" options={customerNames} selected={custFilter} onChange={setCustFilter} />
        <MultiSelectFilter label="Status" options={[...STATUS]} selected={statusFilter} onChange={setStatusFilter} />
      </div>

      {isLoading ? (
        <div className="surface-card rounded-2xl h-64 animate-shimmer" />
      ) : !filtered.length ? (
        <EmptyState icon={FileText} title="No invoices found"
          description={search || statusFilter.length || custFilter.length ? "Try adjusting your filters." : "Create your first invoice to start tracking what you're owed."}
          action={!search && !statusFilter.length ? <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1.5" /> New invoice</Button> : undefined}
        />
      ) : (
        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Invoice</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Issued</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Due</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv: any) => (
                  <tr key={inv.id} className="border-t border-border hover:bg-accent/30 cursor-pointer" onClick={() => setPreviewing(inv)}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.invoice_number}</td>
                    <td className="px-4 py-3">{inv.customer_name ?? "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{inv.due_date ? formatDate(inv.due_date) : "—"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusStyle[inv.status]}`}>{inv.status}</span></td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(inv.total, inv.currency, locale)}</td>
                    <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewing(inv)}><Printer className="h-3.5 w-3.5 mr-2" /> Preview / Print</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditing(inv); setOpen(true); }}><Edit className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                          {inv.status !== "paid" && <DropdownMenuItem onClick={() => markPaid(inv)}><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Mark paid</DropdownMenuItem>}
                          <DropdownMenuItem className="text-destructive" onClick={() => remove(inv.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
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

      <InvoiceDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }} editing={editing} />
      {previewing && <InvoicePreview invoice={previewing} onClose={() => setPreviewing(null)} />}
    </>
  );
}

// ─── Invoice dialog ────────────────────────────────────────────────────────
function InvoiceDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any }) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(initForm(currency));

  const { data: customers } = useQuery({
    queryKey: ["customers", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("customers").select("id,name").order("name")).data ?? [],
  });

  useEffect(() => {
    if (open) setForm(editing ? { ...editing, items: editing.items ?? [] } : initForm(currency));
  }, [open, editing, currency]);

  function setItem(i: number, patch: any) {
    const items = [...(form.items ?? [])];
    items[i] = { ...items[i], ...patch };
    setForm({ ...form, items });
  }
  function addItem() { setForm({ ...form, items: [...(form.items ?? []), { description: "", qty: 1, price: 0, category: "" }] }); }
  function removeItem(i: number) { setForm({ ...form, items: form.items.filter((_: any, j: number) => j !== i) }); }

  const subtotal = (form.items ?? []).reduce((s: number, it: any) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const total = subtotal + (Number(form.tax) || 0) - (Number(form.discount) || 0);

  async function save() {
    if (!user) return;
    if (!form.invoice_number) return toast.error("Invoice number required");
    setSaving(true);
    const payload: any = {
      user_id: user.id,
      invoice_number: form.invoice_number,
      customer_id: form.customer_id || null,
      customer_name: form.customer_name || null,
      issue_date: form.issue_date, due_date: form.due_date || null,
      currency: form.currency, subtotal, tax: Number(form.tax) || 0,
      discount: Number(form.discount) || 0, total,
      amount_paid: Number(form.amount_paid) || 0,
      status: form.status, notes: form.notes || null, items: form.items ?? [],
    };
    const { error } = editing
      ? await supabase.from("invoices").update(payload).eq("id", editing.id)
      : await supabase.from("invoices").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Invoice updated" : "Invoice created");
    qc.invalidateQueries({ queryKey: ["invoices"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit invoice" : "New invoice"}</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Invoice #</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Customer</Label>
            <Select value={form.customer_id || "none"} onValueChange={(v) => {
              const c = customers?.find((x: any) => x.id === v);
              setForm({ ...form, customer_id: v === "none" ? null : v, customer_name: c?.name ?? form.customer_name });
            }}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked customer</SelectItem>
                {customers?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Customer name (on invoice)</Label><Input value={form.customer_name ?? ""} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
          <div><Label>Issue date</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
          <div><Label>Due date</Label><Input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          <div>
            <Label>Category</Label>
            <Select value={form.category || "none"} onValueChange={(v) => setForm({ ...form, category: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment method</Label>
            <Select value={form.payment_method || "none"} onValueChange={(v) => setForm({ ...form, payment_method: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Line items */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label>Line items</Label>
            <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" /> Add item</Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Description</th>
                  <th className="text-right px-3 py-2 font-medium w-20">Qty</th>
                  <th className="text-right px-3 py-2 font-medium w-28">Price</th>
                  <th className="text-right px-3 py-2 font-medium w-28">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {(form.items ?? []).map((it: any, i: number) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2"><Input placeholder="Description" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} className="h-8 text-sm" /></td>
                    <td className="px-3 py-2"><Input type="number" placeholder="1" value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} className="h-8 text-sm text-right" /></td>
                    <td className="px-3 py-2"><Input type="number" placeholder="0.00" value={it.price} onChange={(e) => setItem(i, { price: e.target.value })} className="h-8 text-sm text-right" /></td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{((Number(it.qty) || 0) * (Number(it.price) || 0)).toFixed(2)}</td>
                    <td className="px-2 py-2"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}><X className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
                {!form.items?.length && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground text-sm">No items yet — click "Add item"</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <div><Label>Tax</Label><Input type="number" value={form.tax ?? 0} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></div>
          <div><Label>Discount</Label><Input type="number" value={form.discount ?? 0} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
          <div><Label>Amount paid</Label><Input type="number" value={form.amount_paid ?? 0} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} /></div>
        </div>
        <div className="mt-4"><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <div className="mt-4 surface-card rounded-xl p-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-1"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
          {Number(form.tax) > 0 && <div className="flex justify-between text-sm text-muted-foreground mb-1"><span>Tax</span><span>+{Number(form.tax).toFixed(2)}</span></div>}
          {Number(form.discount) > 0 && <div className="flex justify-between text-sm text-muted-foreground mb-1"><span>Discount</span><span>-{Number(form.discount).toFixed(2)}</span></div>}
          <div className="flex justify-between items-center font-semibold text-lg border-t border-border pt-2 mt-2">
            <span>Total</span><span className="tabular-nums">{formatCurrency(total, form.currency)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0">Save invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initForm(currency: string) {
  return {
    invoice_number: `INV-${Date.now().toString().slice(-6)}`,
    customer_id: null, customer_name: "",
    issue_date: toISODate(new Date()), due_date: "",
    currency, tax: 0, discount: 0, amount_paid: 0,
    status: "draft", notes: "", items: [{ description: "", qty: 1, price: 0 }],
    category: "", payment_method: "",
  };
}

// ─── Professional Invoice Preview / Print ──────────────────────────────────
// InvoicePreview moved to @/components/app/InvoicePrint
// This stub is kept for compat but unused
function _InvoicePreviewOld({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const { profile } = useAuth();
  const items = invoice.items ?? [];
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><title>Invoice ${invoice.invoice_number}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size:13px; color:#1a1a2e; background:#fff; }
        .invoice { max-width:800px; margin:0 auto; padding:48px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:48px; border-bottom:3px solid #6366f1; padding-bottom:24px; }
        .company-name { font-size:24px; font-weight:800; color:#6366f1; }
        .invoice-title { text-align:right; }
        .invoice-title h1 { font-size:32px; font-weight:900; letter-spacing:-1px; color:#1a1a2e; }
        .invoice-title .num { font-size:14px; color:#6b7280; font-family:monospace; }
        .status-badge { display:inline-block; padding:3px 10px; border-radius:4px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }
        .status-paid { background:#dcfce7; color:#166534; }
        .status-sent { background:#dbeafe; color:#1e40af; }
        .status-draft { background:#f3f4f6; color:#374151; }
        .status-overdue { background:#fee2e2; color:#991b1b; }
        .meta { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-bottom:40px; }
        .meta-label { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#9ca3af; font-weight:600; margin-bottom:6px; }
        .meta-value { font-size:14px; font-weight:600; }
        .meta-sub { font-size:12px; color:#6b7280; }
        table { width:100%; border-collapse:collapse; margin-bottom:32px; }
        thead tr { background:#f9fafb; }
        th { text-align:left; padding:10px 12px; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#9ca3af; font-weight:700; border-bottom:2px solid #e5e7eb; }
        th.right { text-align:right; }
        td { padding:12px; border-bottom:1px solid #f3f4f6; font-size:13px; }
        td.right { text-align:right; }
        .totals { margin-left:auto; width:260px; }
        .totals-row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#6b7280; }
        .totals-total { display:flex; justify-content:space-between; padding:12px 0 0; margin-top:8px; border-top:2px solid #1a1a2e; font-size:18px; font-weight:800; color:#1a1a2e; }
        .notes { margin-top:40px; padding:16px; background:#f9fafb; border-radius:8px; font-size:12px; color:#6b7280; border-left:3px solid #6366f1; }
        .footer { margin-top:48px; text-align:center; font-size:11px; color:#d1d5db; border-top:1px solid #f3f4f6; padding-top:24px; }
      </style></head><body><div class="invoice">${content}</div></body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  const statusClass: Record<string, string> = { paid: "status-paid", sent: "status-sent", draft: "status-draft", overdue: "status-overdue", cancelled: "status-draft" };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice {invoice.invoice_number}</DialogTitle>
        </DialogHeader>

        {/* Professional Invoice Layout */}
        <div ref={printRef} className="bg-white text-slate-900 rounded-xl border overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b-4 border-indigo-500">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-2xl font-black text-indigo-600">{profile?.business_name ?? profile?.full_name ?? "Your Business"}</div>
                {profile?.address && <div className="text-sm text-slate-500 mt-1 whitespace-pre-line">{profile.address}</div>}
              </div>
              <div className="text-right">
                <h1 className="text-4xl font-black tracking-tight text-slate-900">INVOICE</h1>
                <div className="font-mono text-sm text-slate-500 mt-1">{invoice.invoice_number}</div>
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                  invoice.status === "paid" ? "bg-green-100 text-green-800" :
                  invoice.status === "overdue" ? "bg-red-100 text-red-800" :
                  invoice.status === "sent" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                }`}>{invoice.status}</span>
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            {/* Meta */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Bill To</div>
                <div className="font-semibold text-slate-900">{invoice.customer_name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Issued</div>
                <div className="font-semibold">{formatDate(invoice.issue_date)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Due</div>
                <div className="font-semibold">{invoice.due_date ? formatDate(invoice.due_date) : "—"}</div>
              </div>
            </div>

            {/* Line items table */}
            <table className="w-full text-sm mb-8">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-3 text-xs uppercase tracking-wider text-slate-500 border-b-2 border-slate-200 font-semibold">Description</th>
                  <th className="text-right p-3 text-xs uppercase tracking-wider text-slate-500 border-b-2 border-slate-200 font-semibold w-20">Qty</th>
                  <th className="text-right p-3 text-xs uppercase tracking-wider text-slate-500 border-b-2 border-slate-200 font-semibold w-28">Unit Price</th>
                  <th className="text-right p-3 text-xs uppercase tracking-wider text-slate-500 border-b-2 border-slate-200 font-semibold w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="p-3 border-b border-slate-100">{it.description}</td>
                    <td className="p-3 text-right border-b border-slate-100">{it.qty}</td>
                    <td className="p-3 text-right border-b border-slate-100">{formatCurrency(it.price, invoice.currency)}</td>
                    <td className="p-3 text-right border-b border-slate-100 font-medium">{formatCurrency((Number(it.qty) || 0) * (Number(it.price) || 0), invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
                {invoice.tax > 0 && <div className="flex justify-between text-slate-500"><span>Tax</span><span className="tabular-nums">+{formatCurrency(invoice.tax, invoice.currency)}</span></div>}
                {invoice.discount > 0 && <div className="flex justify-between text-slate-500"><span>Discount</span><span className="tabular-nums">-{formatCurrency(invoice.discount, invoice.currency)}</span></div>}
                <div className="flex justify-between items-baseline border-t-2 border-slate-900 pt-3 font-bold text-lg">
                  <span>Total</span><span className="tabular-nums">{formatCurrency(invoice.total, invoice.currency)}</span>
                </div>
                {invoice.amount_paid > 0 && (
                  <div className="flex justify-between text-green-600 font-medium"><span>Amount paid</span><span className="tabular-nums">-{formatCurrency(invoice.amount_paid, invoice.currency)}</span></div>
                )}
                {invoice.amount_paid > 0 && (
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2">
                    <span>Balance due</span><span className="tabular-nums">{formatCurrency(invoice.total - invoice.amount_paid, invoice.currency)}</span>
                  </div>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-8 p-4 bg-slate-50 rounded-lg border-l-4 border-indigo-400 text-sm text-slate-600">
                <div className="font-semibold text-slate-700 mb-1">Notes</div>
                {invoice.notes}
              </div>
            )}

            <div className="mt-8 text-center text-xs text-slate-300 border-t border-slate-100 pt-6">
              Thank you for your business.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint} className="gradient-primary text-white border-0">
            <Printer className="h-4 w-4 mr-1.5" /> Print / Save as PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
