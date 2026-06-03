import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <Link to="/home" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="h-6 w-6 rounded-md bg-foreground" />
            <span>Eugeen</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/home">
              <Button variant={pathname === "/home" ? "secondary" : "ghost"} size="sm">
                <Home className="mr-1.5 h-4 w-4" /> Marcas
              </Button>
            </Link>
            {isAdmin && (
              <Link to="/admin">
                <Button variant={pathname === "/admin" ? "secondary" : "ghost"} size="sm">
                  <Shield className="mr-1.5 h-4 w-4" /> Admin
                </Button>
              </Link>
            )}
            <div className="mx-2 hidden h-5 w-px bg-border sm:block" />
            <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}