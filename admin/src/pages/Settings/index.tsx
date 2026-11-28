// Settings: business rates, late fee defaults, grace days and messaging limits.
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "../../api/client";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SelectField from "../../components/forms/SelectField";

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

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsData>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ data: Partial<SettingsData> }>("/settings")
      .then((res) => {
        if (res.data) setForm({ ...DEFAULTS, ...res.data });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
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
      setFeedback("Settings saved. Future bookings use the updated rate snapshot.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Topbar title="Settings" subtitle="Rates, late fees, grace days and messaging limits" />

      <div className="max-w-3xl space-y-6">
        {feedback && (
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
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <Panel title="Business">
              <div className="space-y-4 p-5">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business name</Label>
                  <Input
                    id="businessName"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Pricing" action="Whole Kwacha, per chair per day">
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="rate">Hire rate / day</Label>
                  <Input
                    id="rate"
                    type="number"
                    min={0}
                    step={1}
                    value={form.ratePerChairPerDay}
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
                    onChange={(e) => setForm({ ...form, graceDays: Number(e.target.value) })}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Messaging" action="WhatsApp sends from .env; SMS cap applies here">
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smsCap">Daily SMS cap</Label>
                  <Input
                    id="smsCap"
                    type="number"
                    min={0}
                    step={1}
                    value={form.smsDailyCap}
                    onChange={(e) => setForm({ ...form, smsDailyCap: Number(e.target.value) })}
                  />
                </div>
                <SelectField
                  id="smsMode"
                  label="SMS mode"
                  value={form.smsMode}
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
              <p className="text-sm text-slate-500">
                Each booking snapshots these values at creation time.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
