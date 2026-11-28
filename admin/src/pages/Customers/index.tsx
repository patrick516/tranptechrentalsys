// Customers: search, add, change status, and open a customer's full page.
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Plus, Search } from "lucide-react";
import { customersApi } from "../../api/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import DataTable, { type Column } from "../../components/common/DataTable";
import CustomerStatus from "../../components/customers/CustomerStatus";
import CustomerDetailDrawer from "../../components/customers/CustomerDetailDrawer";
import NewCustomerDialog, { type NewCustomerPayload } from "../../components/customers/NewCustomerDialog";
import ChangeStatusDialog from "../../components/customers/ChangeStatusDialog";
import { typeLabel } from "../../components/customers/customerOptions";
import type { Customer, CustomerStatus as StatusValue } from "../../types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState(""); // what is typed
  const [search, setSearch] = useState(""); // what is searched (after a short pause)
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [newOpen, setNewOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Customer | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Wait 300 ms after typing stops, so the server is not asked on every key.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await customersApi.list(search);
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

  // These throw on failure: the dialog shows the message itself.
  async function createCustomer(payload: NewCustomerPayload) {
    const res = await customersApi.create(payload);
    setFeedback(`Added customer ${res.data.code} · ${res.data.name}.`);
    await loadCustomers();
  }

  async function changeStatus(customer: Customer, status: StatusValue) {
    await customersApi.setStatus(customer._id, status);
    setFeedback(`${customer.name} is now ${status.toLowerCase()}.`);
    await loadCustomers();
  }

  const columns: Column<Customer>[] = [
    { key: "code", header: "Code", render: (c) => <span className="font-medium tabular-nums">{c.code}</span> },
    {
      key: "name",
      header: "Customer",
      render: (c) => (
        <div>
          <button
            type="button"
            onClick={() => setDetailId(c._id)}
            className="text-left font-medium hover:text-primary hover:underline"
          >
            {c.name}
          </button>
          <p className="text-xs text-slate-500">
            {typeLabel(c.type)}
            {c.area ? ` · ${c.area}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Primary contact",
      render: (c) => {
        const primary = c.contacts?.find((ct) => ct.isPrimary) ?? c.contacts?.[0];
        return primary ? (
          <div>
            <p>{primary.name}</p>
            <p className="text-xs tabular-nums text-slate-500">{primary.phone}</p>
          </div>
        ) : (
          <span className="text-slate-400">–</span>
        );
      },
    },
    { key: "status", header: "Status", render: (c) => <CustomerStatus status={c.status} /> },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setDetailId(c._id)}>
            View
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFeedback("");
              setStatusTarget(c);
              setStatusOpen(true);
            }}
          >
            Change status
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Topbar
        title="Customers"
        subtitle="Customer profiles, contacts and standing."
        rightSlot={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, code or phone"
                aria-label="Search customers"
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => {
                setFeedback("");
                setNewOpen(true);
              }}
            >
              <Plus aria-hidden />
              New customer
            </Button>
          </>
        }
      />

      <div className="space-y-4">
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

        <Panel>
          {loading && customers.length === 0 ? (
            <p role="status" className="py-8 text-center text-sm text-slate-500">
              Loading customers…
            </p>
          ) : (
            <div aria-busy={loading}>
              <DataTable
                caption="Customers"
                columns={columns}
                rows={customers}
                rowKey={(c) => c._id}
                emptyText={search ? `No customers match “${search}”.` : "No customers yet. Add your first customer."}
              />
            </div>
          )}
        </Panel>
      </div>

      <NewCustomerDialog key={newOpen ? "open" : "closed"} open={newOpen} onOpenChange={setNewOpen} onCreate={createCustomer} />
      <ChangeStatusDialog
        key={statusTarget?._id ?? "closed"}
        open={statusOpen}
        onOpenChange={setStatusOpen}
        customer={statusTarget}
        onChange={changeStatus}
      />
      <CustomerDetailDrawer key={detailId ?? "closed"} customerId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
