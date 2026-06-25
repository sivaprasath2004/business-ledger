import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — LedgerFlow Pro" }] }),
  component: AuthPage,
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      (async () => {
        const { data } = await supabase.from("profiles").select("onboarded").eq("id", session.user.id).maybeSingle();
        navigate({ to: data?.onboarded ? "/dashboard" : "/welcome" });
      })();
    }
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/welcome`,
            data: { username, full_name: username },
          },
        });
        if (error) throw error;
        toast.success("Welcome to LedgerFlow Pro!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (e: any) {
      toast.error(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative items-center justify-center p-12 overflow-hidden border-r border-border">
        <div className="absolute inset-0 gradient-primary opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_50%)]" />
        <div className="relative z-10 max-w-md text-white">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="font-semibold text-lg">LedgerFlow Pro</span>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight leading-tight">
            Run your business from one calm, beautiful ledger.
          </h2>
          <p className="mt-5 text-white/85 leading-relaxed">
            Built for shop owners, freelancers, accountants, and founders who want clarity over chaos. Track every rupee, dollar, euro — and actually understand where it goes.
          </p>
          <div className="mt-10 space-y-3 text-sm text-white/90">
            {["30+ currencies, switch any time", "Income, expenses, invoices in one place", "Calendar, reminders & analytics built in"].map((l) => (
              <div key={l} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-white" /> {l}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center shadow-glow">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold">LedgerFlow Pro</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {mode === "signup" ? "Start tracking your business in under a minute." : "Sign in to continue to your ledger."}
          </p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input id="username" required minLength={2} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="alex" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            <Button type="submit" className="w-full gradient-primary text-white border-0 shadow-glow" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>{mode === "signup" ? "Create account" : "Sign in"} <ArrowRight className="ml-1 h-4 w-4" /></>)}
            </Button>
          </form>
          <p className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to LedgerFlow?"}{" "}
            <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="text-primary font-medium hover:underline">
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}