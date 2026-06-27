import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCurrency } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, FileText, UserPlus, X } from "lucide-react";
import { toISODate } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

type Entry = Tables<"ledger_entries">;

const CATEGORIES: Record<"income" | "expense", string[]> = {
  income: ["Sales", "Services", "Consulting", "Subscription", "Refund", "Interest", "Other"],
  expense: ["Rent", "Utilities", "Payroll", "Marketing", "Software", "Travel", "Meals", "Supplies", "Taxes", "Bank Fees", "Other"],
};
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Credit Card", "Debit Card", "UPI", "Wire", "Check", "Other"];

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  entry?: Entry | null;
  defaultType?: "income" | "expense";
}

// ─── Add Customer Inline Modal ─────────────────────────────────────────────
function AddCustomerModal({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (id: string, name: string) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!user || !name.trim()) return toast.error("Name is required");
    setSaving(true);
    const { data, error } = await supabase.from("customers").insert({
      user_id: user.id, name: name.trim(), email: email || null,
      phone: phone || null, company: company || null,
    }).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Customer "${data.name}" created`);
    qc.invalidateQueries({ queryKey: ["customers"] });
    onCreated(data.id, data.name);
    onClose();
  }

  useEffect(() => {
    if (open) { setName(""); setEmail(""); setPhone(""); setCompany(""); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label>Name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" autoFocus />
          </div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-1.5" /> Create & Select</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manual invoice number input ──────────────────────────────────────────
function ManualInvoiceInput({ onAdd }: { onAdd: (num: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2">
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="INV-1024 or any reference"
        className="flex-1 text-sm"
        onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); } }}
      />
      <Button
        variant="outline" size="sm" className="gap-1"
        disabled={!val.trim()}
        onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } }}
      >
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
    </div>
  );
}

// ─── Add Invoice Modal ─────────────────────────────────────────────────────
function AttachInvoiceModal({
  open, onClose, onAttached,
}: { open: boolean; onClose: () => void; onAttached: (invoiceNumber: string) => void }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const { data: invoices } = useQuery({
    queryKey: ["invoices", user?.id], enabled: !!user && open,
    queryFn: async () => (await supabase.from("invoices").select("id,invoice_number,customer_name,total,status").order("issue_date", { ascending: false })).data ?? [],
  });

  const filtered = (invoices ?? []).filter((inv: any) =>
    !search || inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Attach Invoice Reference</DialogTitle></DialogHeader>
        <Input placeholder="Search invoice # or customer…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3" />
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {filtered.map((inv: any) => (
            <button
              key={inv.id}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent flex items-center justify-between gap-3 text-sm"
              onClick={() => { onAttached(inv.invoice_number); onClose(); }}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <div className="font-medium">{inv.invoice_number}</div>
                  {inv.customer_name && <div className="text-xs text-muted-foreground">{inv.customer_name}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs capitalize">{inv.status}</Badge>
                <span className="font-semibold tabular-nums text-xs">{inv.total}</span>
              </div>
            </button>
          ))}
          {!filtered.length && <div className="text-center text-muted-foreground py-8 text-sm">No invoices found</div>}
        </div>
        <div className="border-t pt-3 mt-2">
<ManualInvoiceInput onAdd={(num) => { onAttached(num); onClose(); }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dialog ───────────────────────────────────────────────────────────
export function LedgerEntryDialog({ open, onOpenChange, entry, defaultType }: Props) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [attachInvOpen, setAttachInvOpen] = useState(false);

  const [type, setType] = useState<"income" | "expense">(defaultType ?? "income");
  const [date, setDate] = useState(toISODate(new Date()));
  const [amount, setAmount] = useState("");
  const [tax, setTax] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [customerId, setCustomerId] = useState<string>("none");
  const [vendorId, setVendorId] = useState<string>("none");
  const [ledgerNumber, setLedgerNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [entryCurrency, setEntryCurrency] = useState(currency);
  const [attachedInvoices, setAttachedInvoices] = useState<string[]>([]);
  const isLoadingPreserve=useRef(false)
  useEffect(() => {
    console.log("LedgerEntryDialog useEffect", { entry, open, defaultType, currency });
    if(isLoadingPreserve.current){
      isLoadingPreserve.current=false
      return 
    }
    console.log("LedgerEntryDialog useEffect - setting state", { entry, open, defaultType, currency });
    if (entry) {
      setType(entry.type as any);
      setDate(entry.entry_date);
      setAmount(String(entry.amount));
      setTax(String(entry.tax ?? ""));
      setCategory(entry.category ?? "");
      setDescription(entry.description ?? "");
      setPaymentMethod(entry.payment_method ?? "");
      setReference(entry.reference_number ?? "");
      setCustomerId(entry.customer_id ?? "none");
      setVendorId(entry.vendor_id ?? "none");
      setLedgerNumber(entry.ledger_number ?? "");
      setNotes(entry.notes ?? "");
      setEntryCurrency(entry.currency);
      // Parse any attached invoices from the reference field (comma-separated)
      const refs = entry.reference_number?.split(",").map((r) => r.trim()).filter(Boolean) ?? [];
      setAttachedInvoices(refs);
    } else {
      setType(defaultType ?? "income");
      setDate(toISODate(new Date()));
      setAmount(""); setTax(""); setCategory(""); setDescription("");
      setPaymentMethod(""); setReference(""); setCustomerId("none"); setVendorId("none");
      setLedgerNumber(""); setNotes(""); setEntryCurrency(currency);
      setAttachedInvoices([]);
    }
  }, [entry, open, defaultType, currency]);

  const { data: customers } = useQuery({
    queryKey: ["customers", user?.id],
    queryFn: async () => (await supabase.from("customers").select("id,name").order("name")).data ?? [],
    enabled: !!user,
  });
  const { data: vendors } = useQuery({
    queryKey: ["vendors", user?.id],
    queryFn: async () => (await supabase.from("vendors").select("id,name").order("name")).data ?? [],
    enabled: !!user,
  });

function addInvoiceRef(invNum: string) {
  isLoadingPreserve.current=true
  setAttachedInvoices((prev) => {
    if (prev.includes(invNum)) {
      console.log("Already attached", { prev, invNum });
      return prev;
    }

    console.log("Adding invoice", { prev, invNum });
    return [...prev, invNum];
  });
}
console.log({attachedInvoices,open, })
  async function save() {
    if (!user) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setSaving(true);
    const combinedRef = attachedInvoices.length > 0 ? attachedInvoices.join(", ") : (reference || null);
    const payload = {
      user_id: user.id,
      type, entry_date: date,
      amount: amt, tax: parseFloat(tax) || 0,
      currency: entryCurrency,
      category: category || null, description: description || null,
      payment_method: paymentMethod || null,
      reference_number: combinedRef,
      customer_id: customerId !== "none" ? customerId : null,
      vendor_id: vendorId !== "none" ? vendorId : null,
      ledger_number: ledgerNumber || null,
      notes: notes || null,
    };
    const { error } = entry
      ? await supabase.from("ledger_entries").update(payload).eq("id", entry.id)
      : await supabase.from("ledger_entries").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(entry ? "Entry updated" : "Entry added");
    qc.invalidateQueries({ queryKey: ["ledger"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    onOpenChange(false);
  }

  const computedTotal = (parseFloat(amount) || 0) + (parseFloat(tax) || 0);

  return (
    <>
      <Dialog open={open} onOpenChange={(e)=>{
        if(isLoadingPreserve.current){
          isLoadingPreserve.current=false
          return 
        }
        onOpenChange(e)
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{entry ? "Edit ledger entry" : "New ledger entry"}</DialogTitle>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4 py-2">
            {/* Type toggle */}
            <div className="sm:col-span-2 inline-flex rounded-lg border border-border p-1 bg-muted/30 w-fit">
              <button onClick={() => setType("income")} className={`px-3 py-1 rounded-md text-sm font-medium ${type === "income" ? "bg-income text-white" : "text-muted-foreground"}`}>Income</button>
              <button onClick={() => setType("expense")} className={`px-3 py-1 rounded-md text-sm font-medium ${type === "expense" ? "bg-expense text-white" : "text-muted-foreground"}`}>Expense</button>
            </div>

            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div>
              <Label>Amount</Label>
              <div className="flex gap-2">
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="flex-1" />
                <Input value={entryCurrency} onChange={(e) => setEntryCurrency(e.target.value.toUpperCase())} maxLength={3} className="w-20" />
              </div>
            </div>

            <div><Label>Tax</Label><Input type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="0.00" /></div>
            <div>
              <Label>Total (incl. tax)</Label>
              <div className={`flex items-center px-3 h-10 rounded-md border bg-muted/20 text-sm font-semibold ${type === "income" ? "text-income" : "text-expense"}`}>
                {type === "income" ? "+" : "-"}{computedTotal.toFixed(2)} {entryCurrency}
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Invoice #1042 — Acme retainer" />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={category || undefined} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{CATEGORIES[type].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payment method</Label>
              <Select value={paymentMethod || undefined} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Customer / Vendor with inline add */}
            <div>
              <Label>{type === "income" ? "Customer" : "Vendor"}</Label>
              {type === "income" ? (
                <div className="flex gap-2">
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {customers?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setAddCustOpen(true)} title="Add new customer">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendors?.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Invoice reference with attach */}
            <div>
              <Label>Reference # / Invoice</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="INV-1024 or manual ref"
                    className="flex-1"
                    disabled={attachedInvoices.length > 0}
                  />
                  <Button variant="outline" size="icon" onClick={() => setAttachInvOpen(true)} title="Attach invoice">
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
                {/* Attached invoice chips */}
                {attachedInvoices.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {attachedInvoices.map((inv) => (
                      <Badge key={inv} variant="secondary" className="gap-1 pr-1">
                        <FileText className="h-3 w-3" />{inv}
                        <button onClick={() => setAttachedInvoices(attachedInvoices.filter((x) => x !== inv))}>
                          <X className="h-3 w-3 hover:text-destructive" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Ledger #</Label>
              <Input value={ledgerNumber} onChange={(e) => setLedgerNumber(e.target.value)} placeholder="L-001" />
            </div>

            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCustomerModal
        open={addCustOpen}
        onClose={() => setAddCustOpen(false)}
        onCreated={(id, name) => { setCustomerId(id); }}
      />
      <AttachInvoiceModal
        open={attachInvOpen}
        onClose={() => setAttachInvOpen(false)}
        onAttached={addInvoiceRef}
      />
    </>
  );
}
