import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCurrency } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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

export function LedgerEntryDialog({ open, onOpenChange, entry, defaultType }: Props) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
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
    } else {
      setType(defaultType ?? "income");
      setDate(toISODate(new Date()));
      setAmount(""); setTax(""); setCategory(""); setDescription("");
      setPaymentMethod(""); setReference(""); setCustomerId("none"); setVendorId("none");
      setLedgerNumber(""); setNotes(""); setEntryCurrency(currency);
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

  async function save() {
    if (!user) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setSaving(true);
    const payload = {
      user_id: user.id,
      type, entry_date: date,
      amount: amt, tax: parseFloat(tax) || 0,
      currency: entryCurrency,
      category: category || null, description: description || null,
      payment_method: paymentMethod || null,
      reference_number: reference || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit ledger entry" : "New ledger entry"}</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2 inline-flex rounded-lg border border-border p-1 bg-muted/30 w-fit">
            <button onClick={() => setType("income")} className={`px-3 py-1 rounded-md text-sm font-medium ${type === "income" ? "bg-income text-white" : "text-muted-foreground"}`}>
              Income
            </button>
            <button onClick={() => setType("expense")} className={`px-3 py-1 rounded-md text-sm font-medium ${type === "expense" ? "bg-expense text-white" : "text-muted-foreground"}`}>
              Expense
            </button>
          </div>
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Amount</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
          <div><Label>Tax</Label><Input type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="0.00" /></div>
          <div>
            <Label>Currency</Label>
            <Input value={entryCurrency} onChange={(e) => setEntryCurrency(e.target.value.toUpperCase())} maxLength={3} />
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
          <div>
            <Label>{type === "income" ? "Customer" : "Vendor"}</Label>
            {type === "income" ? (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vendors?.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label>Reference #</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="INV-1024" />
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
  );
}