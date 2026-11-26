import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { formatMK } from "../../lib/format";

interface Debtor {
  customerId: string;
  code: string;
  name: string;
  status: string;
  balance: number;
}

export default function ReportsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([]);

  useEffect(() => {
    apiRequest<{ data: Debtor[] }>("/reports/debtors")
      .then((res) => setDebtors(res.data || []))
      .catch(() => setDebtors([]));
  }, []);

  return (
    <div className="space-y-6 font-sans text-brand-navy">
      <div>
        <h1 className="text-2xl font-bold">Debtors &amp; Ledger Report</h1>
        <p className="text-sm text-brand-navy/75">
          Customers with outstanding MK balances.
        </p>
      </div>
      <div className="rounded-lg border border-brand-blue bg-white p-4 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-brand-blue/30 text-xs font-semibold text-brand-blue">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {debtors.map((d) => (
              <tr key={d.customerId} className="border-b border-brand-blue/15">
                <td className="py-2 pr-4 font-mono text-xs">{d.code}</td>
                <td className="py-2 pr-4 font-semibold">{d.name}</td>
                <td className="py-2 pr-4 text-xs">{d.status}</td>
                <td className="py-2 text-right font-bold text-brand-blue">
                  {formatMK(d.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
