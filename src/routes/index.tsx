import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowRight, BarChart3, Calendar, FileText, BookOpen, Sparkles, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LedgerFlow Pro — Your daily business ledger" },
      { name: "description", content: "Track income, expenses, invoices, customers, and revenue analytics in one beautiful, professional ledger platform." },
      { property: "og:title", content: "LedgerFlow Pro" },
      { property: "og:description", content: "The premium ledger & accounting platform for shop owners, freelancers, and growing businesses." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full opacity-20 blur-3xl gradient-primary" />
      </div>
      <header className="border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center shadow-glow">
              <Wallet className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold tracking-tight">LedgerFlow Pro</span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
            <Button asChild size="sm" className="gradient-primary text-white border-0">
              <Link to="/auth" search={{ mode: "signup" } as any}>Get started <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 backdrop-blur px-3 py-1 text-xs text-muted-foreground mb-6">
          <Sparkles className="h-3 w-3 text-primary" /> Built for daily business operations
        </div>
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          The ledger your business <br className="hidden sm:block" />
          <span className="text-gradient">actually wants to open.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Track income, expenses, invoices, customers, vendors, and revenue analytics — all in one calm, premium dashboard that works in any currency, on any device.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="gradient-primary text-white border-0 shadow-glow">
            <Link to="/auth" search={{ mode: "signup" } as any}>Create free account</Link>
          </Button>
          <Button asChild size="lg" variant="outline"><Link to="/auth">I already have an account</Link></Button>
        </div>
        <div className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> No credit card · 30+ currencies · Your data stays yours
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 pb-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, t: "Smart ledger", d: "Income & expenses with categories, tax, attachments, and audit trail." },
          { icon: FileText, t: "Invoices", d: "Issue, track, and follow up — with status, due dates, and PDF export." },
          { icon: Calendar, t: "Calendar & tasks", d: "Payment reminders, meetings, and revenue targets in one view." },
          { icon: BarChart3, t: "Real analytics", d: "Daily, weekly, monthly, yearly revenue & profit trends." },
        ].map((f) => (
          <div key={f.t} className="surface-card rounded-2xl p-5">
            <f.icon className="h-5 w-5 text-primary mb-3" />
            <div className="font-medium">{f.t}</div>
            <div className="text-sm text-muted-foreground mt-1">{f.d}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
