// Exported statements, documents, and file records page
import React, { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../../api/client";

interface CustomerOption {
  _id: string;
  code: string;
  name: string;
}

interface FileDoc {
  _id: string;
  title: string;
  kind:
    | "NATIONAL_ID"
    | "CONTRACT"
    | "PAYMENT_PROOF"
    | "REPORT_EXPORT"
    | "OTHER";
  folder: string;
  url: string;
  createdAt?: string;
}

export default function FilesPage() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [files, setFiles] = useState<FileDoc[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [statementPreview, setStatementPreview] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<FileDoc["kind"]>("CONTRACT");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    setError("");
    try {
      const [custRes, filesRes] = await Promise.all([
        apiRequest<{ data: CustomerOption[] }>("/customers"),
        apiRequest<{ data: FileDoc[] }>("/files"),
      ]);
      const custs = custRes.data || [];
      setCustomers(custs);
      setFiles(filesRes.data || []);
      if (custs.length > 0) {
        setSelectedCustomerId((prev) => prev || custs[0]._id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleExportStatement() {
    if (!selectedCustomerId) return;
    setFeedback("");
    setError("");
    try {
      const expRes = await apiRequest<{
        data: {
          customer: CustomerOption;
          balance: number;
          statementText: string;
        };
      }>(
        `/exports/customer/${encodeURIComponent(selectedCustomerId)}/statement`,
      );

      const text = expRes.data.statementText || "";
      setStatementPreview(text);

      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);

      await apiRequest("/files", {
        method: "POST",
        body: {
          customerId: selectedCustomerId,
          kind: "REPORT_EXPORT",
          folder: "exports",
          title: `Statement - ${expRes.data.customer.code} (${expRes.data.customer.name})`,
          url: blobUrl,
          mimeType: "text/plain",
          sizeBytes: blob.size,
        },
      });

      setFeedback(
        `Exported statement for ${expRes.data.customer.name} and saved to Files.`,
      );
      await loadAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to export statement",
      );
    }
  }

  function handleDownloadText(file: FileDoc) {
    const content =
      statementPreview ||
      `${file.title}\nURL: ${file.url}\nKind: ${file.kind}\n`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${file.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.txt`;
    link.click();
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setFeedback("");
    setError("");
    try {
      await apiRequest("/files", {
        method: "POST",
        body: {
          title: title.trim(),
          url: url.trim(),
          kind,
          folder: kind === "REPORT_EXPORT" ? "exports" : "general",
        },
      });
      setTitle("");
      setUrl("");
      setFeedback("Saved file record.");
      await loadAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save file record",
      );
    }
  }

  return (
    <div className="space-y-6 font-sans text-brand-navy">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">
          Files &amp; Exported Statements
        </h1>
        <p className="text-sm text-brand-navy/75">
          Export customer statements, download reports, and manage contracts,
          IDs, and proofs.
        </p>
      </div>

      {feedback && (
        <div className="rounded-md border border-brand-green bg-brand-green px-4 py-2.5 text-sm font-medium text-white">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-brand-navy bg-brand-navy px-4 py-2.5 text-sm text-white">
          {error}
        </div>
      )}

      {/* Quick Export Customer Statement Box */}
      <div className="rounded-lg border border-brand-green bg-white p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold text-brand-green">
            Export Customer Statement
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy"
          >
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleExportStatement}
          disabled={!selectedCustomerId}
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-50"
        >
          Export Statement
        </button>
      </div>

      {statementPreview && (
        <div className="rounded-lg border border-brand-blue bg-white p-4">
          <div className="text-xs font-bold text-brand-blue">
            Latest Exported Statement Preview
          </div>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-brand-navy">
            {statementPreview}
          </pre>
        </div>
      )}

      {/* Manual File Record Form */}
      <form
        onSubmit={handleAdd}
        className="rounded-lg border border-brand-blue bg-white p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
      >
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-brand-navy">
            Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. National ID or Rental Agreement"
            className="mt-1 w-full rounded-md border border-brand-blue px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy">
            Kind
          </label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as FileDoc["kind"])}
            className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm"
          >
            <option value="CONTRACT">CONTRACT</option>
            <option value="NATIONAL_ID">NATIONAL_ID</option>
            <option value="PAYMENT_PROOF">PAYMENT_PROOF</option>
            <option value="REPORT_EXPORT">REPORT_EXPORT</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy">
            URL / Reference
          </label>
          <input
            type="text"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://... or /docs/..."
            className="mt-1 w-full rounded-md border border-brand-blue px-3 py-2 text-sm"
          />
        </div>

        <div>
          <button
            type="submit"
            className="w-full rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy"
          >
            Save Record
          </button>
        </div>
      </form>

      {/* Exported & Stored Files List */}
      <div className="rounded-lg border border-brand-blue bg-white p-4 space-y-2 text-sm">
        <h2 className="text-base font-bold text-brand-navy">
          Exported &amp; Saved Files ({files.length})
        </h2>
        {files.length === 0 ? (
          <div className="py-3 text-xs text-brand-navy/70">
            No files exported or saved yet.
          </div>
        ) : (
          files.map((f) => (
            <div
              key={f._id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-blue/15 py-2"
            >
              <div>
                <span className="font-semibold text-brand-navy">{f.title}</span>{" "}
                <span className="ml-2 rounded bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold text-brand-blue">
                  {f.kind}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-brand-navy/70 truncate max-w-xs">
                  {f.url}
                </span>
                <button
                  type="button"
                  onClick={() => handleDownloadText(f)}
                  className="rounded-md bg-brand-blue px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-navy"
                >
                  Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
