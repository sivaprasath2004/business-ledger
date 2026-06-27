import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  TrendingUp, TrendingDown, Wallet, Plus, Calendar as CalIcon,
  ArrowUpRight, ArrowDownRight, CircleDollarSign, AlertCircle,
  ArrowRight, FileText, Users,
} from "lucide-react";
import {
  formatCurrency, formatDate,
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
  const navigate = useNavigate();

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
          from: a, to: b,
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
      .select("*").eq("archived", false).order("created_at", { ascending: false }).limit(8)).data ?? [],
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
  const today = toISODate(new Date());
  const monthStart = toISODate(startOfMonth(new Date()));
  const monthEnd = toISODate(endOfMonth(new Date()));
  const yearStart = toISODate(startOfYear(new Date()));

  // Navigate to ledger with filters encoded in URL search params
  function goToLedger(params: { type?: string; dateFrom?: string; dateTo?: string }) {
    const search = new URLSearchParams();
    if (params.type) search.set("type", params.type);
    if (params.dateFrom) search.set("from", params.dateFrom);
    if (params.dateTo) search.set("to", params.dateTo);
    navigate({ to: "/ledger", search: Object.fromEntries(search) as any });
  }

  return (
    <>
      <PageHeader
        title={`${greet()}, ${profile?.full_name?.split(" ")[0] ?? profile?.username ?? "there"}`}
        description={profile?.business_name ? `Here's how ${profile.business_name} is doing today.` : "Here's how stuf is doing today."}
        action={
          <Button onClick={() => setOpenNew(true)} className="gradient-primary text-white border-0 shadow-glow">
            <Plus className="h-4 w-4 mr-1.5" /> New Entry
          </Button>
        }
      />

      {/* Today's stats - clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Today's Revenue" value={formatCurrency(stats?.day?.income ?? 0, currency, locale)}
          icon={TrendingUp} tone="income"
          onClick={() => goToLedger({ type: "income", dateFrom: today, dateTo: today })}
        />
        <StatCard
          label="Today's Expense" value={formatCurrency(stats?.day?.expense ?? 0, currency, locale)}
          icon={TrendingDown} tone="expense"
          onClick={() => goToLedger({ type: "expense", dateFrom: today, dateTo: today })}
        />
        <StatCard
          label="Today's Net" value={formatCurrency(todayNet, currency, locale)}
          icon={CircleDollarSign} tone={todayNet >= 0 ? "income" : "expense"}
          onClick={() => goToLedger({ dateFrom: today, dateTo: today })}
        />
        <StatCard
          label="Outstanding" value={formatCurrency(stats?.outstanding ?? 0, currency, locale)}
          icon={AlertCircle} tone="warning"
          onClick={() => navigate({ to: "/invoices" })}
        />
      </div>

      {/* Monthly/yearly stats - clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Monthly Revenue" value={formatCurrency(stats?.month?.income ?? 0, currency, locale)}
          icon={TrendingUp} tone="income" small
          onClick={() => goToLedger({ type: "income", dateFrom: monthStart, dateTo: monthEnd })}
        />
        <StatCard
          label="Monthly Expense" value={formatCurrency(stats?.month?.expense ?? 0, currency, locale)}
          icon={TrendingDown} tone="expense" small
          onClick={() => goToLedger({ type: "expense", dateFrom: monthStart, dateTo: monthEnd })}
        />
        <StatCard
          label="Monthly Net" value={formatCurrency(monthNet, currency, locale)}
          icon={Wallet} tone={monthNet >= 0 ? "income" : "expense"} small
          onClick={() => goToLedger({ dateFrom: monthStart, dateTo: monthEnd })}
        />
        <StatCard
          label="Yearly Revenue" value={formatCurrency(stats?.year?.income ?? 0, currency, locale)}
          icon={TrendingUp} tone="default" small
          onClick={() => goToLedger({ type: "income", dateFrom: yearStart, dateTo: today })}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 surface-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Cash flow — Last 30 days</h3>
              <p className="text-xs text-muted-foreground">Income vs Expense, daily</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/reports">View reports <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
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
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.75rem", fontSize: 12 }}
                  formatter={(v: any, name: string) => [formatCurrency(v, currency, locale), name === "income" ? "Income" : "Expense"]}
                  labelFormatter={(l) => new Date(l).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}
                />
                <Area type="monotone" dataKey="income" stroke="var(--income)" strokeWidth={2} fill="url(#g-income)" />
                <Area type="monotone" dataKey="expense" stroke="var(--expense)" strokeWidth={2} fill="url(#g-expense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="surface-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent transactions</h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/ledger">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          {!recent?.length ? (
            <div className="text-center text-muted-foreground text-sm py-8">No transactions yet</div>
          ) : (
            <div className="space-y-3">
              {recent.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3">
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Upcoming events</h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/calendar">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
          {!upcoming?.length ? (
            <div className="text-center text-muted-foreground text-sm py-8">No upcoming events</div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((ev: any) => (
                <div key={ev.id} className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    <CalIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{ev.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(ev.starts_at?.slice(0, 10))}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
  label, value, icon: Icon, tone = "default", small = false, onClick,
}: { label: string; value: string; icon: any; tone?: "income" | "expense" | "warning" | "default"; small?: boolean; onClick?: () => void }) {
  const toneClass = {
    income: "text-income bg-income/10",
    expense: "text-expense bg-expense/10",
    warning: "text-warning bg-warning/10",
    default: "text-primary bg-primary/10",
  }[tone];
  return (
    <button
      onClick={onClick}
      className="surface-card rounded-2xl p-4 sm:p-5 w-full text-left group hover:shadow-lifted hover:scale-[1.02] active:scale-[0.99] transition-all duration-150 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={`h-8 w-8 rounded-lg grid place-items-center ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className={`mt-3 font-semibold tabular-nums tracking-tight ${small ? "text-xl" : "text-2xl sm:text-[28px]"}`}>
        {value}
      </div>
      <div className="mt-1.5 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        View in ledger <ArrowRight className="h-2.5 w-2.5" />
      </div>
    </button>
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
