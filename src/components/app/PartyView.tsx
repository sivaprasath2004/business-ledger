import { useEffect as useEffectSync, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Plus, MoreHorizontal, Search, Trash2, Edit, Mail, Phone, Building2 } from "lucide-react";
import { toast } from "sonner";

type Table = "customers" | "vendors";

export function PartyView({
  table, title, description, kind,
}: { table: Table; title: string; description: string; kind: "Customer" | "Vendor" }) {
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
    !search || [c.name, c.email, c.phone, c.company].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  async function remove(id: string) {
    await supabase.from(table).delete().eq("id", id);
    toast.success(`${kind} deleted`);
    qc.invalidateQueries({ queryKey: [table] });
  }

  return (
    <>
      <PageHeader title={title} description={description} action={
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-white border-0 shadow-glow">
          <Plus className="h-4 w-4 mr-1.5" /> New {kind.toLowerCase()}
        </Button>
      } />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${kind.toLowerCase()}s…`} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="surface-card rounded-2xl h-32 animate-shimmer" />)}
        </div>
      ) : !filtered.length ? (
        <EmptyState icon={Users} title={`No ${kind.toLowerCase()}s yet`}
          description={`Add your first ${kind.toLowerCase()} to link them to ledger entries and invoices.`}
          action={<Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1.5" /> Add {kind.toLowerCase()}</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c: any) => (
            <div key={c.id} className="surface-card rounded-2xl p-5 hover:shadow-lifted transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl gradient-primary text-white grid place-items-center text-sm font-semibold shadow-soft">
                  {c.name.split(" ").slice(0,2).map((s: string) => s[0]).join("").toUpperCase()}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditing(c); setOpen(true); }}><Edit className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="font-semibold truncate">{c.name}</div>
              {c.company && <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5"><Building2 className="h-3 w-3" /> {c.company}</div>}
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> <span className="truncate">{c.email}</span></div>}
                {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {c.phone}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <PartyDialog table={table} kind={kind} open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }} editing={editing} />
    </>
  );
}

function PartyDialog({ table, kind, open, onOpenChange, editing }: { table: Table; kind: string; open: boolean; onOpenChange: (v: boolean) => void; editing: any }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const empty = { name: "", email: "", phone: "", company: "", address: "", tax_id: "", notes: "" };
  const [form, setForm] = useState<any>(empty);

  useEffectSync(() => {
    if (open) setForm(editing ? { ...editing } : { ...empty });
  }, [open, editing?.id]);

  async function save() {
    if (!user) return;
    if (!form.name) return toast.error("Name is required");
    setSaving(true);
    const payload = { ...form, user_id: user.id };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? `Edit ${kind.toLowerCase()}` : `New ${kind.toLowerCase()}`}</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Company</Label><Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div><Label>Tax ID</Label><Input value={form.tax_id ?? ""} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}