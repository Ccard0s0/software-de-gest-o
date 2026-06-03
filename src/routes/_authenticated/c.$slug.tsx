import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Folder,
  FolderOpen,
  Upload,
  Plus,
  Loader2,
  FileText,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronRight,
  Download,
  FileImage,
  FileType,
  Film,
  Archive,
} from "lucide-react";
import { useState, useRef, useCallback, DragEvent } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/c/$slug")({
  component: ExplorerPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type FolderRow = {
  id: string;
  name: string;
  parent_id: string | null;
  company_id: string;
};

type AssetRow = {
  id: string;
  name: string;
  storage_path: string;
  category_id: string;
  company_id: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp"];
const VIDEO_EXTS = ["mp4", "mov", "avi", "webm", "mkv"];
const PDF_EXTS = ["pdf"];
const ARCHIVE_EXTS = ["zip", "rar", "7z", "tar", "gz"];

function fileCategory(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (PDF_EXTS.includes(ext)) return "pdf";
  if (ARCHIVE_EXTS.includes(ext)) return "archive";
  return "file";
}

function getPublicUrl(path: string) {
  const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
  return data.publicUrl;
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-5">{description}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} className="rounded-lg">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 hover:bg-red-700 text-white"
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── FileCard ─────────────────────────────────────────────────────────────────

function FileCard({
  asset,
  onDelete,
}: {
  asset: AssetRow;
  onDelete: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const category = fileCategory(asset.name);
  const publicUrl = getPublicUrl(asset.storage_path);

  const Icon =
    category === "image"
      ? FileImage
      : category === "video"
        ? Film
        : category === "pdf"
          ? FileType
          : category === "archive"
            ? Archive
            : FileText;

  return (
    <div className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200">
      {/* Preview */}
      <div className="h-36 flex items-center justify-center bg-gray-50 overflow-hidden">
        {category === "image" && !imgError ? (
          <img
            src={publicUrl}
            alt={asset.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Icon className="h-10 w-10 text-gray-300" strokeWidth={1.2} />
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p
          className="text-xs font-medium text-gray-700 truncate"
          title={asset.name}
        >
          {asset.name}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
          {asset.name.split(".").pop()}
        </p>
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={publicUrl}
          download={asset.name}
          target="_blank"
          rel="noreferrer"
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-white shadow border border-gray-100 hover:bg-gray-50 transition-colors"
          title="Descarregar"
        >
          <Download className="h-3.5 w-3.5 text-gray-600" />
        </a>
        <button
          onClick={onDelete}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-white shadow border border-gray-100 hover:bg-red-50 hover:border-red-200 transition-colors"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        </button>
      </div>
    </div>
  );
}

// ─── FolderItem ───────────────────────────────────────────────────────────────

type FolderItemProps = {
  folder: FolderRow;
  allFolders: FolderRow[];
  activeFolderId: string | null;
  onSelectFolder: (id: string) => void;
  // Editing
  editingId: string | null;
  editingName: string;
  onEditStart: (folder: FolderRow) => void;
  onEditChange: (name: string) => void;
  onEditConfirm: (id: string) => void;
  onEditCancel: () => void;
  // Deleting
  onDeleteRequest: (id: string) => void;
  // Creating child
  creatingInParent: string | undefined; // folder id, or "root" for root level
  onCreateStart: (parentId: string) => void;
  newFolderName: string;
  onNewFolderNameChange: (v: string) => void;
  onCreateConfirm: () => void;
  onCreateCancel: () => void;
  depth: number;
};

function FolderItem({
  folder,
  allFolders,
  activeFolderId,
  onSelectFolder,
  editingId,
  editingName,
  onEditStart,
  onEditChange,
  onEditConfirm,
  onEditCancel,
  onDeleteRequest,
  creatingInParent,
  onCreateStart,
  newFolderName,
  onNewFolderNameChange,
  onCreateConfirm,
  onCreateCancel,
  depth,
}: FolderItemProps) {
  const [expanded, setExpanded] = useState(false);

  const children = allFolders.filter((f) => f.parent_id === folder.id);
  const isActive = activeFolderId === folder.id;
  const isEditing = editingId === folder.id;
  const isCreatingChild = creatingInParent === folder.id;

  const indent = 12 + depth * 14;

  return (
    <div>
      {/* Row */}
      <div
        className={cn(
          "group flex items-center gap-1.5 py-1.5 pr-2 rounded-lg cursor-pointer text-sm transition-colors select-none",
          isActive
            ? "bg-gray-900 text-white"
            : "hover:bg-gray-50 text-gray-700"
        )}
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => {
          if (isEditing) return;
          onSelectFolder(folder.id);
          if (children.length > 0) setExpanded((v) => !v);
        }}
      >
        {/* Chevron (only if has children) */}
        <span className="w-4 shrink-0 flex items-center justify-center">
          {children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="hover:opacity-70 transition-opacity"
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  expanded && "rotate-90"
                )}
              />
            </button>
          )}
        </span>

        {/* Folder icon */}
        {isActive && expanded ? (
          <FolderOpen className="h-4 w-4 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 shrink-0" />
        )}

        {/* Name / edit input */}
        {isEditing ? (
          <Input
            autoFocus
            value={editingName}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEditConfirm(folder.id);
              if (e.key === "Escape") onEditCancel();
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-6 text-sm py-0 px-1.5 flex-1 min-w-0 bg-white text-gray-900 border-gray-300 rounded focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        ) : (
          <span className="flex-1 min-w-0 truncate font-medium">
            {folder.name}
          </span>
        )}

        {/* Edit confirm/cancel */}
        {isEditing && (
          <div
            className="flex gap-0.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="p-1 rounded hover:bg-green-100"
              onClick={() => onEditConfirm(folder.id)}
            >
              <Check className="h-3 w-3 text-green-600" />
            </button>
            <button
              className="p-1 rounded hover:bg-red-100"
              onClick={onEditCancel}
            >
              <X className="h-3 w-3 text-red-500" />
            </button>
          </div>
        )}

        {/* Hover actions */}
        {!isEditing && (
          <div
            className={cn(
              "flex gap-0.5 shrink-0 transition-opacity",
              isActive
                ? "opacity-0 group-hover:opacity-100"
                : "opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Add subfolder */}
            <button
              title="Nova subpasta"
              className={cn(
                "p-1 rounded transition-colors",
                isActive ? "hover:bg-white/20" : "hover:bg-gray-200"
              )}
              onClick={() => {
                setExpanded(true);
                onCreateStart(folder.id);
              }}
            >
              <Plus className="h-3 w-3" />
            </button>
            {/* Rename */}
            <button
              title="Renomear"
              className={cn(
                "p-1 rounded transition-colors",
                isActive ? "hover:bg-white/20" : "hover:bg-gray-200"
              )}
              onClick={() => onEditStart(folder)}
            >
              <Pencil className="h-3 w-3" />
            </button>
            {/* Delete */}
            <button
              title="Eliminar"
              className={cn(
                "p-1 rounded transition-colors",
                isActive ? "hover:bg-red-500/40" : "hover:bg-red-100"
              )}
              onClick={() => onDeleteRequest(folder.id)}
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </button>
          </div>
        )}
      </div>

      {/* Inline new-subfolder input */}
      {isCreatingChild && (
        <div
          className="flex items-center gap-1.5 py-1 pr-2"
          style={{ paddingLeft: `${indent + 20}px` }}
        >
          <Folder className="h-4 w-4 text-gray-400 shrink-0" />
          <Input
            autoFocus
            value={newFolderName}
            onChange={(e) => onNewFolderNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreateConfirm();
              if (e.key === "Escape") onCreateCancel();
            }}
            className="h-6 text-sm py-0 px-1.5 flex-1 border-gray-300 rounded focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Nome da subpasta..."
          />
          <button
            className="p-1 rounded hover:bg-green-100"
            onClick={onCreateConfirm}
          >
            <Check className="h-3 w-3 text-green-600" />
          </button>
          <button
            className="p-1 rounded hover:bg-red-100"
            onClick={onCreateCancel}
          >
            <X className="h-3 w-3 text-red-500" />
          </button>
        </div>
      )}

      {/* Recursive children */}
      {expanded &&
        children.map((child) => (
          <FolderItem
            key={child.id}
            folder={child}
            allFolders={allFolders}
            activeFolderId={activeFolderId}
            onSelectFolder={onSelectFolder}
            editingId={editingId}
            editingName={editingName}
            onEditStart={onEditStart}
            onEditChange={onEditChange}
            onEditConfirm={onEditConfirm}
            onEditCancel={onEditCancel}
            onDeleteRequest={onDeleteRequest}
            creatingInParent={creatingInParent}
            onCreateStart={onCreateStart}
            newFolderName={newFolderName}
            onNewFolderNameChange={onNewFolderNameChange}
            onCreateConfirm={onCreateConfirm}
            onCreateCancel={onCreateCancel}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

// ─── ExplorerPage ─────────────────────────────────────────────────────────────

function ExplorerPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  // Folder edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Folder create — undefined = not creating; "root" = new root folder; string = parent folder id
  const [creatingInParent, setCreatingInParent] = useState<
    string | undefined
  >(undefined);
  const [newFolderName, setNewFolderName] = useState("");

  // Confirms
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<AssetRow | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["explorer", slug],
    queryFn: async () => {
      const { data: company, error } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .single();
      if (error || !company) throw new Error("Company not found");

      const { data: folders } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", company.id)
        .order("name");

      const { data: assets } = await supabase
        .from("assets")
        .select("*")
        .eq("company_id", company.id)
        .order("name");

      return {
        company,
        folders: (folders ?? []) as FolderRow[],
        assets: (assets ?? []) as AssetRow[],
      };
    },
  });

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["explorer", slug] });

  // ── Folder CRUD ───────────────────────────────────────────────────────────

  const handleCreateConfirm = async () => {
    if (!newFolderName.trim() || !data) return;
    const parentId =
      creatingInParent === "root" ? null : creatingInParent ?? null;

    const { error } = await supabase.from("categories").insert({
      company_id: data.company.id,
      name: newFolderName.trim(),
      parent_id: parentId,
    });

    if (error) {
      toast.error("Erro ao criar pasta");
    } else {
      toast.success("Pasta criada!");
      refetch();
    }
    setCreatingInParent(undefined);
    setNewFolderName("");
  };

  const handleCreateCancel = () => {
    setCreatingInParent(undefined);
    setNewFolderName("");
  };

  const handleEditStart = (folder: FolderRow) => {
    setEditingId(folder.id);
    setEditingName(folder.name);
  };

  const handleEditConfirm = async (id: string) => {
    if (!editingName.trim()) return;
    const { error } = await supabase
      .from("categories")
      .update({ name: editingName.trim() })
      .eq("id", id);

    if (error) toast.error("Erro ao renomear pasta");
    else { toast.success("Pasta renomeada!"); refetch(); }

    setEditingId(null);
    setEditingName("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleDeleteFolder = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error("Erro ao eliminar pasta");
    else {
      toast.success("Pasta eliminada!");
      if (activeFolderId === id) setActiveFolderId(null);
      refetch();
    }
    setDeletingFolderId(null);
  };

  // ── File upload ───────────────────────────────────────────────────────────

  const uploadFiles = async (files: FileList | File[]) => {
    if (!activeFolderId || !data) {
      toast.error("Selecione uma pasta para fazer upload");
      return;
    }

    const fileArray = Array.from(files);
    setUploading(true);
    setUploadProgress({ done: 0, total: fileArray.length });

    let successCount = 0;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${data.company.id}/${activeFolderId}/${Date.now()}_${safeName}`;

      const { error: storageError } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: false });

      if (storageError) {
        toast.error(`Falha: ${file.name}`);
      } else {
        await supabase.from("assets").insert({
          category_id: activeFolderId,
          company_id: data.company.id,
          name: file.name,
          storage_path: path,
        });
        successCount++;
      }

      setUploadProgress({ done: i + 1, total: fileArray.length });
    }

    if (successCount > 0) {
      toast.success(
        `${successCount} ficheiro${successCount !== 1 ? "s" : ""} enviado${successCount !== 1 ? "s" : ""}!`
      );
      refetch();
    }

    setUploading(false);
    setUploadProgress(null);

    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── File delete ───────────────────────────────────────────────────────────

  const handleDeleteAsset = async (asset: AssetRow) => {
    await supabase.storage.from("brand-assets").remove([asset.storage_path]);
    const { error } = await supabase.from("assets").delete().eq("id", asset.id);
    if (error) toast.error("Erro ao eliminar ficheiro");
    else { toast.success("Ficheiro eliminado!"); refetch(); }
    setDeletingAsset(null);
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Only fire when leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeFolderId, data]
  );

  // ── Derived ───────────────────────────────────────────────────────────────

  const rootFolders =
    data?.folders.filter((f) => f.parent_id === null) ?? [];
  const activeFolder = data?.folders.find((f) => f.id === activeFolderId);
  const activeAssets =
    data?.assets.filter((a) => a.category_id === activeFolderId) ?? [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#F8F8F8] font-sans overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-72 flex flex-col bg-white border-r border-gray-100 shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
            Pastas
          </span>
          <Button
            size="sm"
            title="Nova pasta raiz"
            className="h-7 w-7 p-0 rounded-lg bg-gray-900 hover:bg-gray-700 text-white"
            onClick={() => {
              setCreatingInParent("root");
              setNewFolderName("");
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {/* New root folder inline input */}
          {creatingInParent === "root" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <Folder className="h-4 w-4 text-gray-400 shrink-0" />
              <Input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateConfirm();
                  if (e.key === "Escape") handleCreateCancel();
                }}
                className="h-6 text-sm py-0 px-1.5 flex-1 border-gray-300 rounded focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Nome da pasta..."
              />
              <button
                className="p-1 rounded hover:bg-green-100"
                onClick={handleCreateConfirm}
              >
                <Check className="h-3 w-3 text-green-600" />
              </button>
              <button
                className="p-1 rounded hover:bg-red-100"
                onClick={handleCreateCancel}
              >
                <X className="h-3 w-3 text-red-500" />
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          ) : rootFolders.length === 0 && creatingInParent !== "root" ? (
            <div className="text-center py-10">
              <Folder
                className="h-8 w-8 text-gray-200 mx-auto mb-2"
                strokeWidth={1.5}
              />
              <p className="text-xs text-gray-400">Sem pastas ainda</p>
              <button
                className="mt-2 text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2"
                onClick={() => {
                  setCreatingInParent("root");
                  setNewFolderName("");
                }}
              >
                Criar primeira pasta
              </button>
            </div>
          ) : (
            rootFolders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                allFolders={data?.folders ?? []}
                activeFolderId={activeFolderId}
                onSelectFolder={setActiveFolderId}
                editingId={editingId}
                editingName={editingName}
                onEditStart={handleEditStart}
                onEditChange={setEditingName}
                onEditConfirm={handleEditConfirm}
                onEditCancel={handleEditCancel}
                onDeleteRequest={setDeletingFolderId}
                creatingInParent={creatingInParent}
                onCreateStart={(parentId) => {
                  setCreatingInParent(parentId);
                  setNewFolderName("");
                }}
                newFolderName={newFolderName}
                onNewFolderNameChange={setNewFolderName}
                onCreateConfirm={handleCreateConfirm}
                onCreateCancel={handleCreateCancel}
                depth={0}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeFolderId ? (
          <>
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {activeFolder?.name}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeAssets.length}{" "}
                  {activeAssets.length === 1 ? "ficheiro" : "ficheiros"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Upload progress */}
                {uploading && uploadProgress && (
                  <span className="text-xs text-gray-500 tabular-nums">
                    {uploadProgress.done}/{uploadProgress.total}
                  </span>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    if (e.target.files?.length) uploadFiles(e.target.files);
                  }}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-gray-900 hover:bg-gray-700 text-white rounded-xl h-9 px-4 gap-2"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload
                </Button>
              </div>
            </div>

            {/* Drop zone / file grid */}
            <div
              className={cn(
                "flex-1 overflow-y-auto p-8 transition-all duration-150",
                isDragOver &&
                  "bg-blue-50 ring-2 ring-inset ring-blue-300 rounded-xl m-3"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragOver ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 pointer-events-none">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Upload className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-sm font-medium text-blue-600">
                    Soltar para fazer upload
                  </p>
                </div>
              ) : activeAssets.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-gray-300 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="p-4 bg-gray-100 rounded-full">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    Arraste ficheiros para aqui
                  </p>
                  <p className="text-xs text-gray-400">
                    ou clique para escolher ficheiros
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 auto-rows-min">
                  {activeAssets.map((asset) => (
                    <FileCard
                      key={asset.id}
                      asset={asset}
                      onDelete={() => setDeletingAsset(asset)}
                    />
                  ))}

                  {/* Inline upload tile */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-[172px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">Adicionar</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="p-5 bg-gray-100 rounded-2xl">
              <Folder
                className="h-10 w-10 text-gray-400"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-sm font-medium text-gray-600">
              Selecione uma pasta
            </p>
            <p className="text-xs text-gray-400">
              para visualizar e gerir os ficheiros
            </p>
          </div>
        )}
      </main>

      {/* ── Modals ── */}

      {deletingFolderId && (
        <ConfirmDialog
          title="Eliminar pasta?"
          description="Todos os ficheiros dentro desta pasta serão eliminados permanentemente. Esta ação não pode ser desfeita."
          onConfirm={() => handleDeleteFolder(deletingFolderId)}
          onCancel={() => setDeletingFolderId(null)}
        />
      )}

      {deletingAsset && (
        <ConfirmDialog
          title="Eliminar ficheiro?"
          description={`"${deletingAsset.name}" será eliminado permanentemente. Esta ação não pode ser desfeita.`}
          onConfirm={() => handleDeleteAsset(deletingAsset)}
          onCancel={() => setDeletingAsset(null)}
        />
      )}
    </div>
  );
}