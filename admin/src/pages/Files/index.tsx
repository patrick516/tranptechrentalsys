// File explorer: a folder tree on the left and the files inside the selected
// folder on the right. Files open inside the portal, they are not downloaded.
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FolderTree as FolderTreeIcon,
  Loader2,
  Search,
  Upload,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { filesApi, type FileDoc, type FolderNode, type CustomerOption } from "../../api/files";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import FormDialog from "../../components/common/FormDialog";
import SelectField from "../../components/forms/SelectField";
import FolderTree from "../../components/files/FolderTree";
import FileViewer from "../../components/files/FileViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KIND_LABELS: Record<string, string> = {
  NATIONAL_ID: "ID images",
  CONTRACT: "Agreements",
  PAYMENT_PROOF: "Payments",
  REPORT_EXPORT: "Reports",
  OTHER: "Other",
};

const KIND_OPTIONS = [
  { value: "ALL", label: "All kinds" },
  { value: "NATIONAL_ID", label: "ID images" },
  { value: "CONTRACT", label: "Agreements" },
  { value: "PAYMENT_PROOF", label: "Payments" },
  { value: "REPORT_EXPORT", label: "Reports" },
  { value: "OTHER", label: "Other" },
];

const UPLOAD_KIND_OPTIONS = KIND_OPTIONS.filter((o) => o.value !== "ALL");

function formatBytes(bytes: number): string {
  if (!bytes) return "–";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [files, setFiles] = useState<FileDoc[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [path, setPath] = useState("customers");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [viewer, setViewer] = useState<{ id: string; title: string } | null>(null);

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCustomer, setUploadCustomer] = useState("");
  const [uploadKind, setUploadKind] = useState("OTHER");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Statement export
  const [statementCustomer, setStatementCustomer] = useState("");

  const loadTree = useCallback(async () => {
    try {
      const res = await filesApi.tree();
      setTree(res.data.roots || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load folders");
    }
  }, []);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await filesApi.list({
        path,
        search,
        kind: kind === "ALL" ? "" : kind,
      });
      setFiles(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [path, search, kind]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    filesApi
      .customers()
      .then((res) => {
        const list = res.data || [];
        setCustomers(list);
        if (list.length > 0) setStatementCustomer((p) => p || list[0]._id);
      })
      .catch(() => setCustomers([]));
    loadTree();
  }, [loadTree]);

  async function handleUpload() {
    if (!uploadFile) throw new Error("Choose a file first");
    const form = new FormData();
    form.append("file", uploadFile);
    form.append("kind", uploadKind);
    form.append("title", uploadFile.name);
    if (uploadCustomer) form.append("customerId", uploadCustomer);
    await filesApi.upload(form);
    setFeedback(`Filed ${uploadFile.name} into the folder tree.`);
    setUploadFile(null);
    await Promise.all([loadTree(), loadFiles()]);
  }

  async function handleExportStatement() {
    if (!statementCustomer) return;
    setError("");
    setFeedback("");
    try {
      const expRes = await apiRequest<{
        data: { customer: CustomerOption; balance: number; statementText: string };
      }>(`/exports/customer/${encodeURIComponent(statementCustomer)}/statement`);
      const text = expRes.data.statementText || "";
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });

      await filesApi.upload(
        (() => {
          const form = new FormData();
          form.append("file", new File([blob], `Statement_${expRes.data.customer.code}.txt`, { type: "text/plain" }));
          form.append("kind", "REPORT_EXPORT");
          form.append("title", `Statement ${expRes.data.customer.code}`);
          form.append("customerId", expRes.data.customer._id);
          return form;
        })(),
      );

      setFeedback(`Statement for ${expRes.data.customer.name} filed in Exports.`);
      await Promise.all([loadTree(), loadFiles()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export statement");
    }
  }

  const kindFromPath = path.split("/").pop() || "";
  const folderTitle =
    path === "customers"
      ? "All customer folders"
      : path === "exports"
        ? "Exports by month"
        : path.split("/").slice(-1)[0] === kindFromPath &&
            KIND_OPTIONS.some((k) => k.value === kindFromPath)
          ? `${path.split("/").slice(0, -1).join(" / ")} / ${KIND_LABELS[kindFromPath] || kindFromPath}`
          : path.replaceAll("/", " / ");

  return (
    <div>
      <Topbar
        title="Files"
        subtitle="Every export and upload is filed into a folder here — nothing is saved to your computer."
        rightSlot={
          <>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search file names…"
                aria-label="Search file names"
                className="w-56 pl-9"
              />
            </div>
            <SelectField
              id="files-kind"
              label="Kind"
              value={kind}
              onValueChange={setKind}
              options={KIND_OPTIONS}
              className="w-40"
            />
            <Button onClick={() => setUploadOpen(true)}>
              <Upload aria-hidden />
              Upload
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {feedback && (
          <p role="status" className="flex items-start gap-2 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {feedback}
          </p>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Panel
            title="Folders"
            action={
              <span className="flex items-center gap-1 text-xs">
                <FolderTreeIcon className="h-3.5 w-3.5" aria-hidden />
                {tree.reduce((n, r) => n + r.fileCount, 0)} files
              </span>
            }
            className="h-fit"
          >
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              <FolderTree
                nodes={tree}
                selectedPath={path}
                onSelect={(next) => setPath(next)}
              />
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel
              title={folderTitle}
              action={`${files.length} file${files.length === 1 ? "" : "s"}`}
            >
              {loading ? (
                <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading files…
                </div>
              ) : files.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  Nothing filed in this folder yet.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {files.map((f) => (
                    <li
                      key={f._id}
                      className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <FileText
                        className="h-4 w-4 shrink-0 text-slate-400"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-brand-navy">
                          {f.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {KIND_LABELS[f.kind] || f.kind} · {f.folder} ·{" "}
                          {f.createdAt ? String(f.createdAt).slice(0, 10) : "–"} ·{" "}
                          {formatBytes(f.sizeBytes)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewer({ id: f._id, title: f.title })}
                      >
                        Open
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Export a customer statement" action="Files into Exports automatically">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <SelectField
                  id="statement-customer"
                  label="Customer"
                  value={statementCustomer}
                  onValueChange={setStatementCustomer}
                  options={customers.map((c) => ({
                    value: c._id,
                    label: `${c.code} · ${c.name}`,
                  }))}
                  placeholder="Choose a customer…"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleExportStatement}
                  disabled={!statementCustomer}
                >
                  Export statement
                </Button>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      <FormDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title="Upload a file"
        description="The file is filed into the customer's folder automatically."
        submitLabel="Upload"
        onSubmit={handleUpload}
      >
        <div className="space-y-2">
          <Label htmlFor="upload-customer">Customer (optional)</Label>
          <SelectField
            id="upload-customer"
            value={uploadCustomer}
            onValueChange={setUploadCustomer}
            options={customers.map((c) => ({
              value: c._id,
              label: `${c.code} · ${c.name}`,
            }))}
            placeholder="No customer (Exports)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upload-kind">Kind</Label>
          <SelectField
            id="upload-kind"
            value={uploadKind}
            onValueChange={setUploadKind}
            options={UPLOAD_KIND_OPTIONS}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upload-file">File</Label>
          <input
            id="upload-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf,text/csv,text/plain,.docx"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-navy hover:file:bg-slate-200"
          />
          <p className="text-xs text-slate-500">PNG, JPG, WEBP, PDF, CSV or DOCX · up to 5 MB</p>
        </div>
      </FormDialog>

      <FileViewer
        docId={viewer?.id ?? null}
        title={viewer?.title ?? ""}
        onClose={() => setViewer(null)}
      />
    </div>
  );
}
