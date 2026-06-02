import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";
import { COMPANY_LOGOS } from "@/lib/company-logos";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Marcas — Brand Hub" }] }),
  component: Home,
});

function Home() {
  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*, categories(id), assets(id)")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">As nossas marcas</h1>
        <p className="mt-2 text-muted-foreground">
          Escolhe uma marca para aceder aos seus assets de design.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {companies?.map((c) => (
            <Link
              key={c.id}
              to="/c/$slug"
              params={{ slug: c.slug }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-sm"
            >
              <div
                className="absolute right-0 top-0 h-32 w-32 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
                style={{ background: c.accent_color ?? "oklch(0.7 0.15 250)" }}
              />
              <div className="relative">
                <div className="mb-4 flex h-16 w-28 items-center justify-start">
                  {COMPANY_LOGOS[c.slug] ? (
                    <img
                      src={COMPANY_LOGOS[c.slug]}
                      alt={c.name}
                      className="max-h-16 max-w-full object-contain"
                    />
                  ) : (
                    <div
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
                      style={{ background: c.accent_color ?? "oklch(0.3 0 0)" }}
                    >
                      <span className="text-sm font-bold">{c.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{c.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(c.categories as { id: string }[] | null)?.length ?? 0} categorias ·{" "}
                  {(c.assets as { id: string }[] | null)?.length ?? 0} ficheiros
                </p>
                <div className="mt-6 flex items-center gap-1 text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100">
                  Abrir <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}