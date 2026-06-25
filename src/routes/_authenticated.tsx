import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
  ssr: false,
});

function AuthedLayout() {
  const { session, loading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/auth", replace: true });
    } else if (profile && !profile.onboarded && typeof window !== "undefined" && window.location.pathname !== "/welcome") {
      navigate({ to: "/welcome", replace: true });
    }
  }, [session, loading, profile, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}