import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Brand Hub" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, user, loading } = useAuth();
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: companies } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", companyId)
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: assets, refetch } = useQuery({
    queryKey: ["admin", "assets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("assets")
        .select("*, categories(name), companies(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="mb-3 h-10 w-10 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Só admins podem aceder a esta página. Pede a um admin para te promover.
          O teu user id: <code className="text-xs">{user?.id}</code>
        </p>
      </div>
    );
  }

  const onUpload = async () => {
    if (!files || !companyId || !categoryId) {
      return toast.error("Escolhe empresa, categoria e ficheiros");
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${companyId}/${categoryId}/${Date.now()}-${file.name}`;
        const { error: e1 } = await supabase.storage
          .from("brand-assets")
          .upload(path, file, { upsert: false });
        if (e1) throw e1;
        const { error: e2 } = await supabase.from("assets").insert({
          category_id: categoryId,
          company_id: companyId,
          name: file.name,
          storage_path: path,
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: user!.id,
        });
        if (e2) throw e2;
      }
      toast.success(`${files.length} ficheiro(s) enviado(s)`);
      setFiles(null);
      (document.getElementById("file-input") as HTMLInputElement).value = "";
      qc.invalidateQueries({ queryKey: ["admin", "assets"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id: string, path: string) => {
    if (!confirm("Apagar este ficheiro?")) return;
    await supabase.storage.from("brand-assets").remove([path]);
    await supabase.from("assets").delete().eq("id", id);
    toast.success("Apagado");
    refetch();
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 text-muted-foreground">Upload e gestão de assets.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Upload de ficheiros</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setCategoryId(""); }}>
              <SelectTrigger><SelectValue placeholder="Escolhe" /></SelectTrigger>
              <SelectContent>
                {companies?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={!companyId}>
              <SelectTrigger><SelectValue placeholder="Escolhe" /></SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="file-input">Ficheiros (múltiplos)</Label>
            <Input
              id="file-input"
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
            />
          </div>
        </div>
        <Button className="mt-4" onClick={onUpload} disabled={uploading}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "A enviar…" : "Enviar"}
        </Button>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Ficheiros recentes</h2>
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Empresa</th>
                <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Categoria</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {assets?.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {(a.companies as { name: string } | null)?.name}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {(a.categories as { name: string } | null)?.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(a.id, a.storage_path)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(!assets || assets.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Sem ficheiros ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}