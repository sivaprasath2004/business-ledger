import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, Wallet, Briefcase, Store, Building2, Calculator, Users,
  HardHat, Rocket, Megaphone, Loader2, ArrowRight, ArrowLeft,
  LayoutDashboard, BookOpen, Calendar, BarChart3, FileText, Download, Smartphone, Check,
} from "lucide-react";
import { CURRENCIES } from "@/lib/format";
import { toast } from "sonner";

const professions = [
  { id: "Beginner", label: "Beginner", icon: Sparkles },
  { id: "Freelancer", label: "Freelancer", icon: Briefcase },
  { id: "Shop Owner", label: "Shop Owner", icon: Store },
  { id: "Business Owner", label: "Business Owner", icon: Building2 },
  { id: "Accountant", label: "Accountant", icon: Calculator },
  { id: "Consultant", label: "Consultant", icon: Users },
  { id: "Contractor", label: "Contractor", icon: HardHat },
  { id: "Startup Founder", label: "Startup Founder", icon: Rocket },
  { id: "Agency Owner", label: "Agency Owner", icon: Megaphone },
  { id: "Other", label: "Other", icon: Sparkles },
];

const tour = [
  { icon: LayoutDashboard, t: "Your Dashboard", d: "Today's revenue, expenses, net profit, outstanding payments, upcoming events — at a glance." },
  { icon: BookOpen, t: "The Ledger", d: "Record every income and expense with category, tax, customer, vendor, and reference." },
  { icon: Calendar, t: "Calendar & Reminders", d: "Add events, payment reminders, and meetings. Click any day to add an entry." },
  { icon: BarChart3, t: "Reports & Analytics", d: "Daily, monthly, yearly revenue and expense trends with comparisons and growth." },
  { icon: FileText, t: "Invoice Management", d: "Issue invoices, track due dates, mark as paid, and export to PDF." },
  { icon: Download, t: "Import & Export", d: "Bring in your existing data via CSV. Export reports and ledgers any time." },
  { icon: Smartphone, t: "Works on mobile", d: "Fully responsive — add an entry from your phone the moment it happens." },
];

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — LedgerFlow Pro" }] }),
  component: Welcome,
  ssr: false,
});

function Welcome() {
  const { session, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [profession, setProfession] = useState<string>("");
  const [currency, setCurrency] = useState("USD");
  const [businessName, setBusinessName] = useState("");
  const [tourIdx, setTourIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
    if (profile?.profession) setProfession(profile.profession);
    if (profile?.currency) setCurrency(profile.currency);
    if (profile?.business_name) setBusinessName(profile.business_name);
  }, [loading, session, profile, navigate]);

  async function finish() {
    if (!session) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      profession, currency, business_name: businessName || null,
      onboarded: true, tour_completed: true,
    }).eq("id", session.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("You're all set!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center p-6">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full opacity-20 blur-3xl gradient-primary" />
      </div>
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center shadow-glow">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold">LedgerFlow Pro</span>
        </div>
        <div className="surface-card rounded-3xl p-8 sm:p-10 shadow-lifted animate-scale-in">
          <div className="flex items-center gap-2 mb-6">
            {[0,1,2].map((i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Step 1 of 3</div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">What best describes you?</h1>
                <p className="text-muted-foreground mt-1 text-sm">We'll tune the experience to fit how you work.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {professions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProfession(p.id)}
                    className={`relative flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all hover:shadow-soft ${
                      profession === p.id
                        ? "border-primary bg-primary/5 shadow-soft"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <p.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{p.label}</span>
                    {profession === p.id && <Check className="absolute top-2 right-2 h-3.5 w-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Step 2 of 3</div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">A few details</h1>
                <p className="text-muted-foreground mt-1 text-sm">You can change these any time in Settings.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Business name <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Acme Studio"
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Default currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Step 3 of 3 — Tour</div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Here's what you'll love</h1>
                <p className="text-muted-foreground mt-1 text-sm">{tourIdx + 1} of {tour.length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-8 text-center min-h-[200px] flex flex-col justify-center items-center">
                <div className="h-14 w-14 rounded-2xl gradient-primary grid place-items-center mb-4 shadow-glow">
                  {(() => { const I = tour[tourIdx].icon; return <I className="h-6 w-6 text-white" />; })()}
                </div>
                <h3 className="font-semibold text-lg">{tour[tourIdx].t}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-md">{tour[tourIdx].d}</p>
              </div>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setTourIdx(Math.max(0, tourIdx - 1))} disabled={tourIdx === 0}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <div className="flex gap-1">
                  {tour.map((_, i) => <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === tourIdx ? "bg-primary" : "bg-muted-foreground/30"}`} />)}
                </div>
                {tourIdx < tour.length - 1 ? (
                  <Button variant="ghost" size="sm" onClick={() => setTourIdx(tourIdx + 1)}>
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground">Ready to launch ↓</div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-border">
            <Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : navigate({ to: "/auth" })}>
              {step === 0 ? "Cancel" : <><ArrowLeft className="h-4 w-4 mr-1" /> Back</>}
            </Button>
            <div className="flex gap-2">
              {step === 2 && <Button variant="outline" onClick={finish} disabled={saving}>Skip tour</Button>}
              {step < 2 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={(step === 0 && !profession) || (step === 1 && !currency)}
                  className="gradient-primary text-white border-0"
                >
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={finish} disabled={saving} className="gradient-primary text-white border-0 shadow-glow">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter LedgerFlow"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}