import React, { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../../api/client";
import CustomerDetailDrawer from "../../components/customers/CustomerDetailDrawer";

interface ContactItem {
  name: string;
  role?: string;
  phone: string;
  network?: string;
  isPrimary?: boolean;
}

interface CustomerRow {
  _id: string;
  code: string;
  name: string;
  type: string;
  status: "ACTIVE" | "WATCHLIST" | "BLOCKED";
  area: string;
  contacts: ContactItem[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  // Quick add customer state
  const [name, setName] = useState("");
  const [type, setType] = useState<
    "SCHOOL" | "CHURCH" | "INDIVIDUAL" | "BUSINESS" | "OTHER"
  >("BUSINESS");
  const [area, setArea] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const res = await apiRequest<{ data: CustomerRow[] }>(`/customers${q}`);
      setCustomers(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  async function handleCreateCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const res = await apiRequest<{ data: CustomerRow }>("/customers", {
        method: "POST",
        body: {
          name,
          type,
          area,
          contacts: [
            { name: contactName, phone: contactPhone, isPrimary: true },
          ],
        },
      });
      setFeedback(`Added customer ${res.data.code} - ${res.data.name}.`);
      setName("");
      setArea("");
      setContactName("");
      setContactPhone("");
      await loadCustomers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create customer",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(
    id: string,
    status: "ACTIVE" | "WATCHLIST" | "BLOCKED",
  ) {
    setError("");
    try {
      await apiRequest(`/customers/${id}/status`, {
        method: "POST",
        body: { status },
      });
      await loadCustomers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update customer status",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">
            Manage customer profiles, primary contacts, and credit standing.
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, code, or phone..."
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm w-full sm:w-64"
        />
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreateCustomer}
        className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
      >
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700">
            Customer Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. St. Andrews School"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Type
          </label>
          <select
            value={type}
            onChange={(e) =>
              setType(
                e.target.value as
                  | "SCHOOL"
                  | "CHURCH"
                  | "INDIVIDUAL"
                  | "BUSINESS"
                  | "OTHER",
              )
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="BUSINESS">BUSINESS</option>
            <option value="SCHOOL">SCHOOL</option>
            <option value="CHURCH">CHURCH</option>
            <option value="INDIVIDUAL">INDIVIDUAL</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Contact Person
          </label>
          <input
            type="text"
            required
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Full name"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Phone (+265 / 099 / 088)
          </label>
          <input
            type="text"
            required
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="0995049331"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add Customer"}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
        {loading ? (
          <div className="text-sm text-slate-600">Loading customers...</div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Primary Contact</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const primary =
                    c.contacts?.find((ct) => ct.isPrimary) || c.contacts?.[0];
                  return (
                    <tr key={c._id} className="border-b border-brand-blue/15">
                      <td className="py-2.5 pr-3 font-mono text-xs">
                        {c.code}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-brand-navy">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(c._id)}
                          className="text-left text-brand-blue hover:underline font-semibold"
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">{c.type}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs">
                        {primary ? `${primary.name} (${primary.phone})` : "-"}
                      </td>
                      <td className="py-2.5 pr-3">
                        <select
                          value={c.status}
                          onChange={(e) =>
                            handleStatusChange(
                              c._id,
                              e.target.value as
                                | "ACTIVE"
                                | "WATCHLIST"
                                | "BLOCKED",
                            )
                          }
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="WATCHLIST">WATCHLIST</option>
                          <option value="BLOCKED">BLOCKED</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <CustomerDetailDrawer
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    </div>
  );
}
