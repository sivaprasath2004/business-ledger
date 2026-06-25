import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCurrency } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, Plus, MoreHorizontal, Trash2, Edit, CheckCircle2, X, Printer } from "lucide-react";
import { formatCurrency, formatDate, toISODate } from "@/lib/format";
import { toast } from "sonner";

const STATUS = ["draft", "sent", "paid", "overdue", "cancelled"] as const;
const statusStyle: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  paid: "bg-income/10 text-income",
  overdue: "bg-expense/10 text-expense",
  cancelled: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices — LedgerFlow Pro" }] }),
  component: Invoices,
});

function Invoices() {
  const { user } = useAuth();
  const { currency, locale } = useCurrency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [previewing, setPreviewing] = useState<any>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("invoices").select("*").order("issue_date", { ascending: false })).data ?? [],
  });

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

  return (
    <>
      <PageHeader title="Invoices" description="Issue, track, and chase payment on every invoice." action={
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-white border-0 shadow-glow">
          <Plus className="h-4 w-4 mr-1.5" /> New invoice
        </Button>
      } />

      {isLoading ? (
        <div className="surface-card rounded-2xl h-64 animate-shimmer" />
      ) : !invoices?.length ? (
        <EmptyState icon={FileText} title="No invoices yet"
          description="Create your first invoice to start tracking what you're owed."
          action={<Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1.5" /> New invoice</Button>}
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
                {invoices.map((inv: any) => (
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
  function addItem() { setForm({ ...form, items: [...(form.items ?? []), { description: "", qty: 1, price: 0 }] }); }
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
            <Select
              value={form.customer_id || "none"}
              onValueChange={(v) => {
                const c = customers?.find((x) => x.id === v);
                setForm({ ...form, customer_id: v === "none" ? null : v, customer_name: c?.name ?? form.customer_name });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked customer</SelectItem>
                {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Customer name (on invoice)</Label><Input value={form.customer_name ?? ""} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
          <div><Label>Issue date</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
          <div><Label>Due date</Label><Input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label>Line items</Label>
            <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" /> Add item</Button>
          </div>
          <div className="space-y-2">
            {(form.items ?? []).map((it: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-6" placeholder="Description" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                <Input className="col-span-2" type="number" placeholder="Qty" value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} />
                <Input className="col-span-3" type="number" placeholder="Price" value={it.price} onChange={(e) => setItem(i, { price: e.target.value })} />
                <Button variant="ghost" size="icon" className="col-span-1" onClick={() => removeItem(i)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            {!form.items?.length && <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">No items yet</div>}
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <div><Label>Tax</Label><Input type="number" value={form.tax ?? 0} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></div>
          <div><Label>Discount</Label><Input type="number" value={form.discount ?? 0} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
          <div><Label>Amount paid</Label><Input type="number" value={form.amount_paid ?? 0} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} /></div>
        </div>
        <div className="mt-4"><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <div className="mt-4 surface-card rounded-xl p-4 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-semibold tabular-nums">{formatCurrency(total, form.currency)}</span>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0">Save</Button>
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
  };
}

function InvoicePreview({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const { profile } = useAuth();
  const items = invoice.items ?? [];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Invoice {invoice.invoice_number}</DialogTitle></DialogHeader>
        <div className="bg-white text-slate-900 dark:bg-white dark:text-slate-900 rounded-xl p-8 border print:border-0 print:shadow-none print:rounded-none" id="invoice-print">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="text-2xl font-bold">INVOICE</div>
              <div className="text-sm text-slate-500 mt-1">{invoice.invoice_number}</div>
            </div>
            <div className="text-right text-sm">
              <div className="font-semibold">{profile?.business_name ?? profile?.full_name}</div>
              <Badge className={statusStyle[invoice.status] + " mt-1 capitalize"}>{invoice.status}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div><div className="text-slate-500 mb-1">Bill to</div><div className="font-medium">{invoice.customer_name ?? "—"}</div></div>
            <div className="text-right">
              <div className="text-slate-500 mb-1">Issued · Due</div>
              <div>{formatDate(invoice.issue_date)} · {invoice.due_date ? formatDate(invoice.due_date) : "—"}</div>
            </div>
          </div>
          <table className="w-full text-sm mb-4">
            <thead className="bg-slate-100">
              <tr><th className="text-left p-2">Description</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Price</th><th className="text-right p-2">Total</th></tr>
            </thead>
            <tbody>
              {items.map((it: any, i: number) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="p-2">{it.description}</td><td className="p-2 text-right">{it.qty}</td>
                  <td className="p-2 text-right">{formatCurrency(it.price, invoice.currency)}</td>
                  <td className="p-2 text-right">{formatCurrency((Number(it.qty)||0) * (Number(it.price)||0), invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end">
            <div className="w-64 text-sm space-y-1">
              <Row label="Subtotal" value={formatCurrency(invoice.subtotal, invoice.currency)} />
              <Row label="Tax" value={formatCurrency(invoice.tax, invoice.currency)} />
              <Row label="Discount" value={`- ${formatCurrency(invoice.discount, invoice.currency)}`} />
              <div className="flex justify-between border-t border-slate-300 pt-2 mt-1 font-semibold text-base">
                <span>Total</span><span>{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
            </div>
          </div>
          {invoice.notes && <div className="mt-6 text-xs text-slate-500 border-t border-slate-200 pt-3">{invoice.notes}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()} className="gradient-primary text-white border-0"><Printer className="h-4 w-4 mr-1.5" /> Print / Save as PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-slate-500">{label}</span><span className="tabular-nums">{value}</span></div>;
}