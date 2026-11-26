// Business rate, late fee, grace period, and SMS cap configuration page
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";

interface SettingsData {
  businessName: string;
  ratePerChairPerDay: number;
  lateFeePerDay: number;
  graceDays: number;
  smsDailyCap: number;
  smsMode: "live" | "log";
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsData>({
    businessName: "TranpTech Chair Rentals",
    ratePerChairPerDay: 400,
    lateFeePerDay: 2000,
    graceDays: 0,
    smsDailyCap: 100,
    smsMode: "log",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest<{ data: SettingsData }>("/settings");
        if (res.data) {
          setForm({
            businessName: res.data.businessName ?? "TranpTech Chair Rentals",
            ratePerChairPerDay: res.data.ratePerChairPerDay ?? 400,
            lateFeePerDay: res.data.lateFeePerDay ?? 2000,
            graceDays: res.data.graceDays ?? 0,
            smsDailyCap: res.data.smsDailyCap ?? 100,
            smsMode: res.data.smsMode ?? "log",
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load settings",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFeedback("");
    setError("");
    try {
      await apiRequest("/settings", {
        method: "PUT",
        body: {
          businessName: form.businessName,
          ratePerChairPerDay: Number(form.ratePerChairPerDay),
          lateFeePerDay: Number(form.lateFeePerDay),
          graceDays: Number(form.graceDays),
          smsDailyCap: Number(form.smsDailyCap),
          smsMode: form.smsMode,
        },
      });
      setFeedback(
        "Settings saved. Future bookings will use the updated rate snapshot.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-600">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Configure default daily chair hire rates, late fee defaults, grace
          days, and SMS limits.
        </p>
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
        onSubmit={handleSave}
        className="rounded-xl border border-slate-200 bg-white p-4 space-y-4"
      >
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Business Name
          </label>
          <input
            type="text"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Rate / Chair / Day (MK)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.ratePerChairPerDay}
              onChange={(e) =>
                setForm({ ...form, ratePerChairPerDay: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Late Fee / Day (MK)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.lateFeePerDay}
              onChange={(e) =>
                setForm({ ...form, lateFeePerDay: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Grace Days
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.graceDays}
              onChange={(e) =>
                setForm({ ...form, graceDays: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Daily SMS Cap
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.smsDailyCap}
              onChange={(e) =>
                setForm({ ...form, smsDailyCap: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              SMS Mode
            </label>
            <select
              value={form.smsMode}
              onChange={(e) =>
                setForm({ ...form, smsMode: e.target.value as "live" | "log" })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="log">log</option>
              <option value="live">live</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
