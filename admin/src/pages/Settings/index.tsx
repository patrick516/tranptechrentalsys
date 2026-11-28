// Settings: shown as a read-only table; an edit icon unlocks the form to save.
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { apiRequest } from "../../api/client";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import DataTable, { type Column } from "../../components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SelectField from "../../components/forms/SelectField";
import { formatMK } from "../../lib/format";

interface SettingsData {
  businessName: string;
  ratePerChairPerDay: number;
  lateFeePerDay: number;
  graceDays: number;
  smsDailyCap: number;
  smsMode: "live" | "log";
}

const DEFAULTS: SettingsData = {
  businessName: "TranpTech Chair Rentals",
  ratePerChairPerDay: 400,
  lateFeePerDay: 2000,
  graceDays: 0,
  smsDailyCap: 100,
  smsMode: "log",
};

const SMS_MODE_LABEL: Record<SettingsData["smsMode"], string> = {
  live: "live — send for real",
  log: "log — record only, do not send",
};

interface SettingRow {
  key: string;
  group: string;
  label: string;
  value: string;
}

function toRows(s: SettingsData): SettingRow[] {
  return [
    { key: "businessName", group: "Business", label: "Business name", value: s.businessName },
    {
      key: "rate",
      group: "Pricing",
      label: "Hire rate / day",
      value: `${formatMK(s.ratePerChairPerDay)} per chair`,
    },
    { key: "lateFee", group: "Pricing", label: "Late fee / day", value: formatMK(s.lateFeePerDay) },
    {
      key: "grace",
      group: "Pricing",
      label: "Grace days",
      value: `${s.graceDays} ${s.graceDays === 1 ? "day" : "days"}`,
    },
    {
      key: "smsCap",
      group: "Messaging",
      label: "Daily SMS cap",
      value: `${s.smsDailyCap} messages / day`,
    },
    { key: "smsMode", group: "Messaging", label: "SMS mode", value: SMS_MODE_LABEL[s.smsMode] },
  ];
}

export default function SettingsPage() {
  const [saved, setSaved] = useState<SettingsData>(DEFAULTS);
  const [form, setForm] = useState<SettingsData>(DEFAULTS);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ data: Partial<SettingsData> }>("/settings")
      .then((res) => {
        if (res.data) {
          const next = { ...DEFAULTS, ...res.data };
          setSaved(next);
          setForm(next);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  function startEdit() {
    setForm(saved);
    setError("");
    setFeedback("");
    setEditing(true);
  }

  function cancelEdit() {
    setForm(saved);
    setError("");
    setEditing(false);
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFeedback("");
    setError("");
    try {
      const payload = {
        businessName: form.businessName,
        ratePerChairPerDay: Number(form.ratePerChairPerDay),
        lateFeePerDay: Number(form.lateFeePerDay),
        graceDays: Number(form.graceDays),
        smsDailyCap: Number(form.smsDailyCap),
        smsMode: form.smsMode,
      };
      await apiRequest("/settings", { method: "PUT", body: payload });
      setSaved(payload);
      setForm(payload);
      setEditing(false);
      setFeedback("Settings saved. Future bookings use the updated rate snapshot.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const rows = toRows(saved);
  const shown: SettingRow[] = rows.map((row, i) => ({
    ...row,
    group: i > 0 && rows[i - 1].group === row.group ? "" : row.group,
  }));

  const tableColumns: Column<SettingRow>[] = [
    { key: "group", header: "Section", render: (row) => <span className="text-slate-500">{row.group}</span> },
    { key: "label", header: "Setting", render: (row) => <span className="font-medium text-brand-navy">{row.label}</span> },
    { key: "value", header: "Value", render: (row) => <span className="tabular-nums text-slate-700">{row.value}</span> },
  ];

  return (
    <div>
      <Topbar title="Settings" subtitle="Rates, late fees, grace days and messaging limits" />

      <div className="max-w-3xl space-y-6">
        {feedback && !editing && (
          <p role="status" className="flex items-start gap-2 text-sm text-emerald-700">
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

        {loading ? (
          <p className="text-sm text-slate-500">Loading settings…</p>
        ) : !editing ? (
          <Panel
            title="Settings"
            action={
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Edit
              </Button>
            }
          >
            <DataTable
              columns={tableColumns}
              rows={shown}
              rowKey={(row) => row.key}
              caption="Current business settings"
            />
            <p className="mt-4 text-xs text-slate-500">
              Each booking snapshots these values at creation time. Press Edit to change them.
            </p>
          </Panel>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <Panel title="Business">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business name</Label>
                  <Input
                    id="businessName"
                    value={form.businessName}
                    disabled={saving}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Pricing" action="Whole Kwacha, per chair per day">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="rate">Hire rate / day</Label>
                  <Input
                    id="rate"
                    type="number"
                    min={0}
                    step={1}
                    value={form.ratePerChairPerDay}
                    disabled={saving}
                    onChange={(e) => setForm({ ...form, ratePerChairPerDay: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lateFee">Late fee / day</Label>
                  <Input
                    id="lateFee"
                    type="number"
                    min={0}
                    step={1}
                    value={form.lateFeePerDay}
                    disabled={saving}
                    onChange={(e) => setForm({ ...form, lateFeePerDay: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grace">Grace days</Label>
                  <Input
                    id="grace"
                    type="number"
                    min={0}
                    step={1}
                    value={form.graceDays}
                    disabled={saving}
                    onChange={(e) => setForm({ ...form, graceDays: Number(e.target.value) })}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Messaging" action="WhatsApp sends from .env; SMS cap applies here">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smsCap">Daily SMS cap</Label>
                  <Input
                    id="smsCap"
                    type="number"
                    min={0}
                    step={1}
                    value={form.smsDailyCap}
                    disabled={saving}
                    onChange={(e) => setForm({ ...form, smsDailyCap: Number(e.target.value) })}
                  />
                </div>
                <SelectField
                  id="smsMode"
                  label="SMS mode"
                  value={form.smsMode}
                  disabled={saving}
                  onValueChange={(v) => setForm({ ...form, smsMode: v as SettingsData["smsMode"] })}
                  options={[
                    { value: "log", label: "log — record only, do not send" },
                    { value: "live", label: "live — send for real" },
                  ]}
                />
              </div>
            </Panel>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save settings"}
              </Button>
              <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
              <p className="text-sm text-slate-500">Values become read-only again after saving.</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
