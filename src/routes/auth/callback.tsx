import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Escuta mudanças no estado de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);
      if (event === "SIGNED_IN" && session) {
        navigate({ to: "/home", replace: true });
      }
    });

    // Verificação inicial caso o redirect já tenha trazido a sessão
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Erro ao obter sessão:", error.message);
      } else if (data.session) {
        navigate({ to: "/home", replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
        <p>A validar autenticação...</p>
      </div>
    </div>
  );
}