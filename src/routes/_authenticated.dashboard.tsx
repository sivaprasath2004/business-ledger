import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCurrency } from "@/lib/auth";
import { PageHeader } from "@/components/app/AppShell";
import { LedgerEntryDialog } from "@/components/app/LedgerEntryDialog";
import { Button } from "@/components/ui/button";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, Plus, Calendar as CalIcon, ArrowUpRight, ArrowDownRight,
  CircleDollarSign, AlertCircle, ArrowRight, FileText, Users,
} from "lucide-react";
import {
  formatCurrency, formatDate, formatRelative,
  startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, toISODate,
} from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LedgerFlow Pro" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile } = useAuth();
  const { currency, locale } = useCurrency();
  const [openNew, setOpenNew] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["dashboard", "stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date();
      const ranges = {
        day: [toISODate(startOfDay(today)), toISODate(endOfDay(today))],
        month: [toISODate(startOfMonth(today)), toISODate(endOfMonth(today))],
        year: [toISODate(startOfYear(today)), toISODate(endOfYear(today))],
      };
      const sums: any = {};
      for (const [k, [a, b]] of Object.entries(ranges)) {
        const { data } = await supabase.from("ledger_entries")
          .select("type,amount").eq("archived", false)
          .gte("entry_date", a).lte("entry_date", b);
        sums[k] = {
          income: (data ?? []).filter((d) => d.type === "income").reduce((s, d) => s + Number(d.amount), 0),
          expense: (data ?? []).filter((d) => d.type === "expense").reduce((s, d) => s + Number(d.amount), 0),
        };
      }
      const { data: outstanding } = await supabase.from("invoices")
        .select("total,amount_paid,status").neq("status", "paid");
      const out = (outstanding ?? []).reduce((s, i) => s + Math.max(0, Number(i.total) - Number(i.amount_paid)), 0);
      return { ...sums, outstanding: out };
    },
  });

  const { data: chart } = useQuery({
    queryKey: ["dashboard", "chart", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const start = new Date(); start.setDate(start.getDate() - 29);
      const { data } = await supabase.from("ledger_entries")
        .select("entry_date,type,amount").eq("archived", false)
        .gte("entry_date", toISODate(start));
      const buckets: Record<string, { date: string; income: number; expense: number }> = {};
      for (let i = 0; i < 30; i++) {
        const d = new Date(); d.setDate(d.getDate() - (29 - i));
        const k = toISODate(d);
        buckets[k] = { date: k, income: 0, expense: 0 };
      }
      for (const e of data ?? []) {
        const k = e.entry_date;
        if (!buckets[k]) continue;
        buckets[k][e.type as "income" | "expense"] += Number(e.amount);
      }
      return Object.values(buckets);
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["dashboard", "recent", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("ledger_entries")
      .select("*").order("created_at", { ascending: false }).limit(8)).data ?? [],
  });

  const { data: upcoming } = useQuery({
    queryKey: ["dashboard", "upcoming", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("calendar_events")
      .select("*").gte("starts_at", new Date().toISOString())
      .order("starts_at").limit(6)).data ?? [],
  });

  const todayNet = (stats?.day?.income ?? 0) - (stats?.day?.expense ?? 0);
  const monthNet = (stats?.month?.income ?? 0) - (stats?.month?.expense ?? 0);

  return (
    <>
      <PageHeader
        title={`${greet()}, ${profile?.full_name?.split(" ")[0] ?? profile?.username ?? "there"}`}
        description={profile?.business_name ? `Here's how ${profile.business_name} is doing today.` : "Here's how your business is doing today."}
        action={
          <Button onClick={() => setOpenNew(true)} className="gradient-primary text-white border-0 shadow-glow">
            <Plus className="h-4 w-4 mr-1.5" /> New Entry
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Today's Revenue" value={formatCurrency(stats?.day?.income ?? 0, currency, locale)} icon={TrendingUp} tone="income" />
        <StatCard label="Today's Expense" value={formatCurrency(stats?.day?.expense ?? 0, currency, locale)} icon={TrendingDown} tone="expense" />
        <StatCard label="Today's Net" value={formatCurrency(todayNet, currency, locale)} icon={CircleDollarSign} tone={todayNet >= 0 ? "income" : "expense"} />
        <StatCard label="Outstanding" value={formatCurrency(stats?.outstanding ?? 0, currency, locale)} icon={AlertCircle} tone="warning" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Monthly Revenue" value={formatCurrency(stats?.month?.income ?? 0, currency, locale)} icon={TrendingUp} tone="income" small />
        <StatCard label="Monthly Expense" value={formatCurrency(stats?.month?.expense ?? 0, currency, locale)} icon={TrendingDown} tone="expense" small />
        <StatCard label="Monthly Net" value={formatCurrency(monthNet, currency, locale)} icon={Wallet} tone={monthNet >= 0 ? "income" : "expense"} small />
        <StatCard label="Yearly Revenue" value={formatCurrency(stats?.year?.income ?? 0, currency, locale)} icon={TrendingUp} tone="default" small />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 surface-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Cash flow — Last 30 days</h3>
              <p className="text-xs text-muted-foreground">Income vs Expense, daily</p>
            </div>
            <Button asChild variant="ghost" size="sm"><Link to="/reports">View reports <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link></Button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart ?? []} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--income)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--income)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--expense)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--expense)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(d) => new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short" })} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any, n) => [formatCurrency(v, currency, locale), n]}
                  labelFormatter={(d) => formatDate(d as string)}
                />
                <Area type="monotone" dataKey="income" stroke="var(--income)" fill="url(#g-income)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" stroke="var(--expense)" fill="url(#g-expense)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><CalIcon className="h-4 w-4 text-primary" /> Upcoming</h3>
            <Button asChild variant="ghost" size="sm"><Link to="/calendar">Calendar</Link></Button>
          </div>
          {!upcoming?.length ? (
            <div className="text-sm text-muted-foreground flex-1 grid place-items-center text-center">
              No upcoming events.<br />
              <Link to="/calendar" className="text-primary hover:underline mt-1 inline-block">Add one →</Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
                    {new Date(e.starts_at).toLocaleDateString(locale, { day: "2-digit" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{formatRelative(e.starts_at)} · {e.event_type}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 surface-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent transactions</h3>
            <Button asChild variant="ghost" size="sm"><Link to="/ledger">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link></Button>
          </div>
          {!recent?.length ? (
            <div className="text-sm text-muted-foreground py-12 text-center">No transactions yet.</div>
          ) : (
            <div className="space-y-1">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors">
                  <div className={`h-9 w-9 rounded-lg grid place-items-center ${r.type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                    {r.type === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.description || r.category || (r.type === "income" ? "Income" : "Expense")}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(r.entry_date)} · {r.category ?? "Uncategorized"}</div>
                  </div>
                  <div className={`text-sm font-semibold tabular-nums ${r.type === "income" ? "text-income" : "text-expense"}`}>
                    {r.type === "income" ? "+" : "-"}{formatCurrency(r.amount, r.currency, locale)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-card rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Quick actions</h3>
          <div className="space-y-2">
            <Action onClick={() => setOpenNew(true)} icon={Plus} label="Add ledger entry" />
            <Action to="/invoices" icon={FileText} label="Create invoice" />
            <Action to="/customers" icon={Users} label="Add customer" />
            <Action to="/calendar" icon={CalIcon} label="Schedule event" />
            <Action to="/reports" icon={TrendingUp} label="View reports" />
          </div>
        </div>
      </div>

      <LedgerEntryDialog open={openNew} onOpenChange={setOpenNew} />
    </>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  label, value, icon: Icon, tone = "default", small = false,
}: { label: string; value: string; icon: any; tone?: "income" | "expense" | "warning" | "default"; small?: boolean }) {
  const toneClass = {
    income: "text-income bg-income/10",
    expense: "text-expense bg-expense/10",
    warning: "text-warning bg-warning/10",
    default: "text-primary bg-primary/10",
  }[tone];
  return (
    <div className="surface-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={`h-8 w-8 rounded-lg grid place-items-center ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className={`mt-3 font-semibold tabular-nums tracking-tight ${small ? "text-xl" : "text-2xl sm:text-[28px]"}`}>
        {value}
      </div>
    </div>
  );
}

function Action({ to, onClick, icon: Icon, label }: { to?: string; onClick?: () => void; icon: any; label: string }) {
  const body = (
    <>
      <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm font-medium flex-1">{label}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </>
  );
  return to ? (
    <Link to={to} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors">{body}</Link>
  ) : (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors text-left">{body}</button>
  );
}