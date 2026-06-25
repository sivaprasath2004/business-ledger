import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — LedgerFlow Pro" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState<any>({ full_name: "", username: "", business_name: "", currency: "USD", locale: "en-US", profession: "", theme: "dark" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (profile) setForm({ ...profile }); }, [profile]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name, username: form.username, business_name: form.business_name,
      currency: form.currency, locale: form.locale, profession: form.profession, theme: form.theme,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    if (form.theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    await refreshProfile();
    toast.success("Settings saved");
  }

  return (
    <>
      <PageHeader title="Settings" description="Profile, business, currency, and theme preferences." />
      <div className="max-w-3xl space-y-6">
        <Section title="Profile">
          <Field label="Full name"><Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Username"><Input value={form.username ?? ""} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label="Email"><Input value={user?.email ?? ""} disabled /></Field>
          <Field label="Profession">
            <Select value={form.profession ?? ""} onValueChange={(v) => setForm({ ...form, profession: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{["Beginner","Freelancer","Shop Owner","Business Owner","Accountant","Consultant","Contractor","Startup Founder","Agency Owner","Other"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title="Business">
          <Field label="Business name"><Input value={form.business_name ?? ""} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="Optional" /></Field>
          <Field label="Default currency">
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Locale"><Input value={form.locale ?? ""} onChange={(e) => setForm({ ...form, locale: e.target.value })} placeholder="en-US" /></Field>
        </Section>

        <Section title="Appearance">
          <Field label="Theme">
            <Select value={form.theme} onValueChange={(v) => setForm({ ...form, theme: v })}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="dark">Dark</SelectItem><SelectItem value="light">Light</SelectItem></SelectContent>
            </Select>
          </Field>
        </Section>

        <div className="flex justify-between items-center gap-3 pt-2">
          <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}>
            <LogOut className="h-4 w-4 mr-1.5" /> Sign out
          </Button>
          <Button onClick={save} disabled={saving} className="gradient-primary text-white border-0 shadow-glow">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card rounded-2xl p-6">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}