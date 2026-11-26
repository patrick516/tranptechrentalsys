import React, { useState } from "react";
import { apiRequest } from "../../api/client";

interface CustomerOption {
  _id: string;
  code: string;
  name: string;
}

interface StatementExporterProps {
  customers: CustomerOption[];
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  onExported: (previewText: string, message: string) => void;
  onError: (message: string) => void;
}

export default function StatementExporter({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onExported,
  onError,
}: StatementExporterProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!selectedCustomerId) return;
    setExporting(true);
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

      onExported(text, `Exported statement for ${expRes.data.customer.name}.`);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Failed to export statement",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="rounded-lg border border-brand-green bg-white p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
      <div className="flex-1">
        <label className="block text-xs font-bold text-brand-green">
          Export Customer Statement
        </label>
        <select
          value={selectedCustomerId}
          onChange={(e) => onSelectCustomer(e.target.value)}
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
        onClick={handleExport}
        disabled={exporting || !selectedCustomerId}
        className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-50"
      >
        {exporting ? "Exporting..." : "Export Statement"}
      </button>
    </div>
  );
}
