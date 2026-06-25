import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCurrency } from "@/lib/auth";
import { PageHeader } from "@/components/app/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Area, AreaChart, Bar, BarChart, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { formatCurrency, formatDate, toISODate } from "@/lib/format";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports & Analytics — LedgerFlow Pro" }] }),
  component: Reports,
});

function Reports() {
  const { user } = useAuth();
  const { currency, locale } = useCurrency();
  const [range, setRange] = useState<"30" | "90" | "365" | "lifetime">("90");

  const { data: entries } = useQuery({
    queryKey: ["reports", user?.id, range],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("ledger_entries").select("entry_date,type,amount,category").eq("archived", false);
      if (range !== "lifetime") {
        const days = parseInt(range);
        const start = new Date(); start.setDate(start.getDate() - days);
        q = q.gte("entry_date", toISODate(start));
      }
      const { data } = await q.order("entry_date");
      return data ?? [];
    },
  });

  const all = entries ?? [];
  const income = all.filter((e) => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
  const expense = all.filter((e) => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const profit = income - expense;
  const margin = income > 0 ? (profit / income) * 100 : 0;

  // Group by month for trend
  const monthly: Record<string, { month: string; income: number; expense: number }> = {};
  all.forEach((e) => {
    const k = e.entry_date.slice(0, 7);
    monthly[k] ??= { month: k, income: 0, expense: 0 };
    monthly[k][e.type as "income" | "expense"] += Number(e.amount);
  });
  const trend = Object.values(monthly).map((m) => ({ ...m, profit: m.income - m.expense }));

  // Daily
  const dailyMap: Record<string, { date: string; income: number; expense: number }> = {};
  all.forEach((e) => {
    dailyMap[e.entry_date] ??= { date: e.entry_date, income: 0, expense: 0 };
    dailyMap[e.entry_date][e.type as "income" | "expense"] += Number(e.amount);
  });
  const daily = Object.values(dailyMap);

  // Category breakdown
  const expCats: Record<string, number> = {};
  all.filter((e) => e.type === "expense").forEach((e) => {
    const k = e.category ?? "Other";
    expCats[k] = (expCats[k] ?? 0) + Number(e.amount);
  });
  const expPie = Object.entries(expCats).map(([name, value]) => ({ name, value }));

  const incCats: Record<string, number> = {};
  all.filter((e) => e.type === "income").forEach((e) => {
    const k = e.category ?? "Other";
    incCats[k] = (incCats[k] ?? 0) + Number(e.amount);
  });
  const incPie = Object.entries(incCats).map(([name, value]) => ({ name, value }));

  const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--income)", "var(--expense)"];

  return (
    <>
      <PageHeader title="Reports & Analytics" description="Revenue, expense, and profit trends — daily, monthly, yearly." action={
        <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
          <TabsList>
            <TabsTrigger value="30">30D</TabsTrigger>
            <TabsTrigger value="90">90D</TabsTrigger>
            <TabsTrigger value="365">1Y</TabsTrigger>
            <TabsTrigger value="lifetime">All</TabsTrigger>
          </TabsList>
        </Tabs>
      } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi label="Revenue" value={formatCurrency(income, currency, locale)} icon={TrendingUp} tone="income" />
        <Kpi label="Expenses" value={formatCurrency(expense, currency, locale)} icon={TrendingDown} tone="expense" />
        <Kpi label="Net Profit" value={formatCurrency(profit, currency, locale)} icon={profit >= 0 ? ArrowUpRight : ArrowDownRight} tone={profit >= 0 ? "income" : "expense"} />
        <Kpi label="Profit Margin" value={`${margin.toFixed(1)}%`} icon={TrendingUp} tone={margin >= 0 ? "income" : "expense"} />
      </div>

      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="breakdown">Category breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="trend">
          <div className="surface-card rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Daily cash flow</h3>
            <div className="h-80">
              <ResponsiveContainer>
                <AreaChart data={daily} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="r-income" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--income)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--income)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="r-expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--expense)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--expense)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { day: "numeric", month: "short" })} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: any, n) => [formatCurrency(v, currency), n]} labelFormatter={(d) => formatDate(d as string)} />
                  <Area dataKey="income" stroke="var(--income)" fill="url(#r-income)" strokeWidth={2} />
                  <Area dataKey="expense" stroke="var(--expense)" fill="url(#r-expense)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="monthly">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="surface-card rounded-2xl p-5">
              <h3 className="font-semibold mb-4">Monthly income vs expense</h3>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: any, n) => [formatCurrency(v, currency), n]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" fill="var(--income)" radius={[4,4,0,0]} />
                    <Bar dataKey="expense" fill="var(--expense)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="surface-card rounded-2xl p-5">
              <h3 className="font-semibold mb-4">Profit trend</h3>
              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: any) => formatCurrency(v, currency)} />
                    <Line type="monotone" dataKey="profit" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="grid lg:grid-cols-2 gap-4">
            <Donut title="Income by category" data={incPie} colors={PIE_COLORS} currency={currency} locale={locale} />
            <Donut title="Expenses by category" data={expPie} colors={PIE_COLORS} currency={currency} locale={locale} />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: "income" | "expense" }) {
  return (
    <div className="surface-card rounded-2xl p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`h-8 w-8 rounded-lg grid place-items-center ${tone === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-semibold tabular-nums mt-3">{value}</div>
    </div>
  );
}

function Donut({ title, data, colors, currency, locale }: { title: string; data: { name: string; value: number }[]; colors: string[]; currency: string; locale: string }) {
  return (
    <div className="surface-card rounded-2xl p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      {!data.length ? (
        <div className="h-64 grid place-items-center text-sm text-muted-foreground">No data yet</div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: any) => formatCurrency(v, currency, locale)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}