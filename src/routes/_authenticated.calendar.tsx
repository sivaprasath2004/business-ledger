import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toISODate } from "@/lib/format";
import { toast } from "sonner";

const TYPE_COLORS: Record<string, string> = {
  event: "bg-primary/15 text-primary border-primary/30",
  task: "bg-warning/15 text-warning border-warning/30",
  reminder: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  meeting: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  payment: "bg-income/15 text-income border-income/30",
  invoice: "bg-expense/15 text-expense border-expense/30",
};

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — LedgerFlow Pro" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const start = new Date(month); start.setDate(1);
  const end = new Date(month); end.setMonth(end.getMonth() + 1); end.setDate(0); end.setHours(23,59,59,999);

  const { data: events } = useQuery({
    queryKey: ["events", user?.id, month.toISOString()],
    enabled: !!user,
    queryFn: async () => (await supabase.from("calendar_events").select("*").gte("starts_at", start.toISOString()).lte("starts_at", end.toISOString())).data ?? [],
  });

  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: ({ date: Date } | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ date: new Date(month.getFullYear(), month.getMonth(), i + 1) })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay: Record<string, any[]> = {};
  (events ?? []).forEach((e) => {
    const k = toISODate(new Date(e.starts_at));
    (eventsByDay[k] ??= []).push(e);
  });

  async function remove(id: string) {
    await supabase.from("calendar_events").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["events"] });
    toast.success("Removed");
  }

  return (
    <>
      <PageHeader title="Calendar" description="Events, tasks, payment reminders & meetings — all in one view." action={
        <Button onClick={() => { setEditing(null); setSelectedDate(toISODate(new Date())); setOpen(true); }} className="gradient-primary text-white border-0 shadow-glow">
          <Plus className="h-4 w-4 mr-1.5" /> New event
        </Button>
      } />

      <div className="surface-card rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => { const d = new Date(); d.setDate(1); setMonth(d); }}>Today</Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-1">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <div key={d} className="px-2 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <div key={i} className="aspect-square sm:aspect-[5/4] rounded-lg bg-muted/20" />;
            const k = toISODate(c.date);
            const evs = eventsByDay[k] ?? [];
            const isToday = toISODate(new Date()) === k;
            return (
              <button
                key={i}
                onClick={() => { setSelectedDate(k); setEditing(null); setOpen(true); }}
                className={`aspect-square sm:aspect-[5/4] rounded-lg border text-left p-1.5 hover:bg-accent/40 transition-colors flex flex-col ${isToday ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className={`text-xs font-semibold mb-1 ${isToday ? "text-primary" : ""}`}>{c.date.getDate()}</div>
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  {evs.slice(0, 3).map((e) => (
                    <div key={e.id} className={`truncate text-[10px] px-1.5 py-0.5 rounded border ${TYPE_COLORS[e.event_type] ?? TYPE_COLORS.event}`}>
                      {e.title}
                    </div>
                  ))}
                  {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3} more</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 surface-card rounded-2xl p-5">
        <h3 className="font-semibold mb-4">Upcoming this month</h3>
        {!events?.length ? (
          <div className="text-sm text-muted-foreground text-center py-8">No events scheduled.</div>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/40 group">
                <div className={`px-2 py-1 rounded-md text-xs border ${TYPE_COLORS[e.event_type] ?? TYPE_COLORS.event}`}>{e.event_type}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(e.starts_at).toLocaleString()}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover:opacity-100" onClick={() => remove(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <EventDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setSelectedDate(null); } }} editing={editing} defaultDate={selectedDate} />
    </>
  );
}

function EventDialog({ open, onOpenChange, editing, defaultDate }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any; defaultDate: string | null }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ title: "", description: "", event_type: "event", date: toISODate(new Date()), time: "09:00" });

  useEffect(() => {
    if (open) {
      if (editing) {
        const d = new Date(editing.starts_at);
        setForm({ title: editing.title, description: editing.description ?? "", event_type: editing.event_type, date: toISODate(d), time: d.toTimeString().slice(0,5) });
      } else {
        setForm({ title: "", description: "", event_type: "event", date: defaultDate ?? toISODate(new Date()), time: "09:00" });
      }
    }
  }, [open, editing, defaultDate]);

  async function save() {
    if (!user) return;
    if (!form.title) return toast.error("Title required");
    setSaving(true);
    const starts_at = new Date(`${form.date}T${form.time}:00`).toISOString();
    const payload = { user_id: user.id, title: form.title, description: form.description || null, event_type: form.event_type, starts_at };
    const { error } = editing
      ? await supabase.from("calendar_events").update(payload).eq("id", editing.id)
      : await supabase.from("calendar_events").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Updated" : "Event added");
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What's happening?" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(TYPE_COLORS).map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}