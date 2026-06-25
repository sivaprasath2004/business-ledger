import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pin, StickyNote, Trash2 } from "lucide-react";
import { formatRelative } from "@/lib/format";
import { toast } from "sonner";

const CATEGORIES = ["personal", "business", "meeting", "financial", "calendar"];
const COLORS = ["#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#ede9fe", "#fed7aa"];

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [{ title: "Notes & Tasks — LedgerFlow Pro" }] }),
  component: NotesPage,
});

function NotesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: notes, isLoading } = useQuery({
    queryKey: ["notes", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("notes").select("*").order("pinned", { ascending: false }).order("updated_at", { ascending: false })).data ?? [],
  });

  async function togglePin(n: any) {
    await supabase.from("notes").update({ pinned: !n.pinned }).eq("id", n.id);
    qc.invalidateQueries({ queryKey: ["notes"] });
  }
  async function remove(id: string) {
    await supabase.from("notes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notes"] });
    toast.success("Note deleted");
  }

  return (
    <>
      <PageHeader title="Notes & Tasks" description="Quick thoughts, meeting notes, business reminders." action={
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-white border-0 shadow-glow">
          <Plus className="h-4 w-4 mr-1.5" /> New note
        </Button>
      } />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="surface-card rounded-2xl h-40 animate-shimmer" />)}</div>
      ) : !notes?.length ? (
        <EmptyState icon={StickyNote} title="No notes yet" description="Capture quick thoughts, meeting takeaways, or follow-ups."
          action={<Button onClick={() => setOpen(true)} className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1.5" /> New note</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((n) => (
            <div key={n.id} className="rounded-2xl p-4 border border-border group transition-shadow hover:shadow-lifted relative"
              style={{ background: n.color ? `color-mix(in oklab, ${n.color} 30%, var(--card))` : "var(--card)" }}
              onClick={() => { setEditing(n); setOpen(true); }}>
              <div className="flex items-start justify-between mb-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{n.category}</div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); togglePin(n); }}>
                    <Pin className={`h-3.5 w-3.5 ${n.pinned ? "fill-primary text-primary" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); remove(n.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {n.title && <div className="font-semibold mb-1">{n.title}</div>}
              <div className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-6">{n.content}</div>
              <div className="text-[11px] text-muted-foreground mt-3">{formatRelative(n.updated_at)}</div>
            </div>
          ))}
        </div>
      )}

      <NoteDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }} editing={editing} />
    </>
  );
}

function NoteDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ title: "", content: "", category: "personal", color: COLORS[0], pinned: false });

  useEffect(() => {
    if (open) setForm(editing ?? { title: "", content: "", category: "personal", color: COLORS[0], pinned: false });
  }, [open, editing]);

  async function save() {
    if (!user) return;
    if (!form.content && !form.title) return toast.error("Add a title or content");
    setSaving(true);
    const payload: any = { user_id: user.id, title: form.title || null, content: form.content || null, category: form.category, color: form.color, pinned: !!form.pinned };
    const { error } = editing
      ? await supabase.from("notes").update(payload).eq("id", editing.id)
      : await supabase.from("notes").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notes"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit note" : "New note"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
          <Textarea rows={8} value={form.content ?? ""} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your note…" />
          <div className="flex gap-3 items-center">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} className={`h-6 w-6 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}