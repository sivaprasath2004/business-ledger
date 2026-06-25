import { type ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, BookOpen, TrendingUp, TrendingDown, Users, Truck,
  FileText, Calendar, StickyNote, BarChart3, Settings, LogOut,
  Upload, Download, Menu, X, Search, Plus, Sparkles, Sun, Moon, ChevronDown,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENCIES } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navGroups: { label: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/reports", label: "Reports & Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Accounting",
    items: [
      { to: "/ledger", label: "Ledger Entries", icon: BookOpen },
      { to: "/income", label: "Income", icon: TrendingUp },
      { to: "/expenses", label: "Expenses", icon: TrendingDown },
      { to: "/invoices", label: "Invoices", icon: FileText },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/vendors", label: "Vendors", icon: Truck },
    ],
  },
  {
    label: "Productivity",
    items: [
      { to: "/calendar", label: "Calendar", icon: Calendar },
      { to: "/notes", label: "Notes & Tasks", icon: StickyNote },
    ],
  },
  {
    label: "Data",
    items: [
      { to: "/import", label: "Import", icon: Upload },
      { to: "/export", label: "Export", icon: Download },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <DesktopSidebar />
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar border-r border-sidebar-border shadow-lifted">
            <SidebarInner onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
      <SidebarInner />
    </aside>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center shadow-glow">
          <Wallet className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-sm tracking-tight">LedgerFlow</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Pro · Daily Ops</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((g) => (
          <div key={g.label}>
            <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {g.label}
            </div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.to || pathname.startsWith(it.to + "/");
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={onNavigate}
                    className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} strokeWidth={2} />
                    <span className="font-medium">{it.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-sidebar-border">
        <Link
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <Settings className="h-4 w-4" /> Settings
        </Link>
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { profile, user, refreshProfile } = useAuth();
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  async function toggleTheme() {
    const newTheme = isDark ? "light" : "dark";
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    if (user) await supabase.from("profiles").update({ theme: newTheme }).eq("id", user.id);
    refreshProfile();
  }

  async function changeCurrency(code: string) {
    if (!user) return;
    await supabase.from("profiles").update({ currency: code }).eq("id", user.id);
    await refreshProfile();
    toast.success(`Currency set to ${code}`);
  }

  const initials = (profile?.full_name || profile?.username || user?.email || "U")
    .split(/\s|@/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

  return (
    <header className="h-16 shrink-0 border-b border-border bg-background/70 backdrop-blur-xl sticky top-0 z-30">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center gap-3">
        <button onClick={onMenu} className="lg:hidden p-2 -ml-2 rounded-md hover:bg-accent">
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions, invoices, customers…"
            className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:bg-background"
          />
          <kbd className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground">⌘K</kbd>
        </div>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 hidden sm:flex gap-1.5">
              <span className="font-mono text-xs">{profile?.currency ?? "USD"}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
            <DropdownMenuLabel>Display currency</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CURRENCIES.map((c) => (
              <DropdownMenuItem key={c.code} onClick={() => changeCurrency(c.code)}>
                <span className="font-mono text-xs w-12">{c.code}</span>
                <span className="text-muted-foreground">{c.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button asChild size="sm" className="h-9 gap-1.5 gradient-primary text-white border-0 shadow-glow hidden sm:inline-flex">
          <Link to="/ledger" search={{ new: "1" } as any}><Plus className="h-4 w-4" /> New Entry</Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full hover:bg-accent p-0.5 pr-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-primary to-chart-5 text-white text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="text-sm font-medium">{profile?.full_name ?? profile?.username ?? "User"}</span>
              <span className="text-xs text-muted-foreground font-normal truncate">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/settings"><Settings className="h-4 w-4 mr-2" /> Settings</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/welcome"><Sparkles className="h-4 w-4 mr-2" /> Welcome tour</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function PageHeader({
  title, description, action,
}: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {action && <div className="flex gap-2 shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon, title, description, action,
}: { icon: any; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="surface-card rounded-2xl p-12 text-center flex flex-col items-center">
      <div className="h-14 w-14 rounded-2xl bg-muted/60 grid place-items-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Re-export the inline icons for convenience
export { X };