import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, FileText, Folder } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { COMPANY_LOGOS } from "@/lib/company-logos";

export const Route = createFileRoute("/_authenticated/c/$slug")({
  head: () => ({ meta: [{ title: "Marca — Brand Hub" }] }),
  component: CompanyPage,
});

function CompanyPage() {
  const { slug } = Route.useParams();
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["company", slug],
    queryFn: async () => {
      const { data: company, error: e1 } = await supabase
        .from("companies")
        .select("*")
        .eq("slug", slug)
        .single();
      if (e1) throw e1;
      const { data: categories } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", company.id)
        .order("sort_order");
      const { data: assets } = await supabase
        .from("assets")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });
      return { company, categories: categories ?? [], assets: assets ?? [] };
    },
  });

  const download = async (path: string, name: string) => {
    const { data: blob, error } = await supabase.storage.from("brand-assets").download(path);
    if (error || !blob) return toast.error("Falha ao descarregar");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !data) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  }

  const filtered = activeCat
    ? data.assets.filter((a) => a.category_id === activeCat)
    : data.assets;

  return (
    <div>
      <Link to="/home" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="mr-1 h-4 w-4" /> Marcas
      </Link>

      <div className="mb-8 flex items-center gap-4">
        {COMPANY_LOGOS[data.company.slug] ? (
          <img
            src={COMPANY_LOGOS[data.company.slug]}
            alt={data.company.name}
            className="h-14 w-auto max-w-[160px] object-contain"
          />
        ) : (
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
            style={{ background: data.company.accent_color ?? "oklch(0.3 0 0)" }}
          >
            <span className="text-xl font-bold">{data.company.name.charAt(0)}</span>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{data.company.name}</h1>
          <p className="text-sm text-muted-foreground">
            {data.assets.length} ficheiros disponíveis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <div className="space-y-0.5">
            <button
              onClick={() => setActiveCat(null)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                !activeCat ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50"
              }`}
            >
              <Folder className="h-4 w-4" /> Tudo
              <span className="ml-auto text-xs text-muted-foreground">{data.assets.length}</span>
            </button>
            {data.categories.map((cat) => {
              const count = data.assets.filter((a) => a.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    activeCat === cat.id ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50"
                  }`}
                >
                  <Folder className="h-4 w-4" />
                  <span className="truncate">{cat.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sem ficheiros nesta categoria.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Nome</th>
                    <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Tipo</th>
                    <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Tamanho</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {filtered.map((a) => (
                    <tr key={a.id} className="group hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{a.name}</div>
                            {a.description && (
                              <div className="text-xs text-muted-foreground">{a.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                        {a.mime_type?.split("/")[1] ?? "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                        {formatSize(a.file_size)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => download(a.storage_path, a.name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function formatSize(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}