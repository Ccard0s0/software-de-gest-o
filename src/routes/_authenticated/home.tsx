import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, FolderOpen, Layers, Building2, MoreHorizontal } from "lucide-react";
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

  const totalAssets =
    companies?.reduce(
      (acc, c) => acc + ((c.assets as { id: string }[] | null)?.length ?? 0),
      0,
    ) ?? 0;
  const totalCategories =
    companies?.reduce(
      (acc, c) => acc + ((c.categories as { id: string }[] | null)?.length ?? 0),
      0,
    ) ?? 0;
  const totalBrands = companies?.length ?? 0;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Brand Hub
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            As nossas marcas
          </h1>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Hero stat — dark card */}
        <div className="relative col-span-1 overflow-hidden rounded-2xl bg-foreground p-6 text-background">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-background/5" />
          <div className="absolute -bottom-6 -left-2 h-32 w-32 rounded-full bg-background/5" />
          <div className="relative">
            <div className="mb-1 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 opacity-50" />
              <span className="text-xs font-medium uppercase tracking-widest opacity-50">
                Marcas
              </span>
            </div>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              {isLoading ? (
                <span className="inline-block h-12 w-16 animate-pulse rounded-lg bg-background/10" />
              ) : (
                totalBrands
              )}
            </p>
            <div className="mt-6 flex items-center gap-1 text-xs opacity-40">
              <span>activas na plataforma</span>
            </div>
          </div>
        </div>

        {/* Categorias */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-widest">
                Categorias
              </span>
            </div>
          </div>
          <p className="mt-4 text-5xl font-bold tracking-tight text-foreground">
            {isLoading ? (
              <span className="inline-block h-12 w-16 animate-pulse rounded-lg bg-muted" />
            ) : (
              totalCategories
            )}
          </p>
          <p className="mt-6 text-xs text-muted-foreground/50">no total</p>
        </div>

        {/* Ficheiros */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-widest">
              Ficheiros
            </span>
          </div>
          <p className="mt-4 text-5xl font-bold tracking-tight text-foreground">
            {isLoading ? (
              <span className="inline-block h-12 w-16 animate-pulse rounded-lg bg-muted" />
            ) : (
              totalAssets
            )}
          </p>
          <p className="mt-6 text-xs text-muted-foreground/50">disponíveis</p>
        </div>
      </div>

      {/* ── Company list ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* List header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-6">
            <button className="border-b-2 border-foreground pb-0.5 text-sm font-semibold text-foreground">
              Marcas
            </button>
          </div>
          <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-4 border-b border-border/50 px-6 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Nome
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Slug
          </span>
          <span className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Categorias
          </span>
          <span className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Ficheiros
          </span>
          <span />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/40">
          {isLoading
            ? [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] items-center gap-4 px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                      <div className="h-2 w-16 animate-pulse rounded bg-muted/60" />
                    </div>
                  </div>
                  <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
                  <div className="mx-auto h-6 w-10 animate-pulse rounded-full bg-muted" />
                  <div className="mx-auto h-6 w-10 animate-pulse rounded-full bg-muted" />
                  <div />
                </div>
              ))
            : companies?.map((c) => {
                const cats = (c.categories as { id: string }[] | null)?.length ?? 0;
                const files = (c.assets as { id: string }[] | null)?.length ?? 0;

                return (
                  <Link
                    key={c.id}
                    to="/c/$slug"
                    params={{ slug: c.slug }}
                    className="group grid grid-cols-[2fr_1fr_1fr_1fr_40px] items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
                  >
                    {/* Logo + name */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/50">
                        {COMPANY_LOGOS[c.slug] ? (
                          <img
                            src={COMPANY_LOGOS[c.slug]}
                            alt={c.name}
                            className="max-h-6 max-w-6 object-contain"
                          />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">
                            {c.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {c.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground/60">
                          marca
                        </p>
                      </div>
                    </div>

                    {/* Slug */}
                    <span className="truncate font-mono text-xs text-muted-foreground/60">
                      {c.slug}
                    </span>

                    {/* Cats pill */}
                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        <FolderOpen className="h-3 w-3" />
                        {cats}
                      </span>
                    </div>

                    {/* Files pill */}
                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        <Layers className="h-3 w-3" />
                        {files}
                      </span>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-end">
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 transition-all group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </div>
  );
}