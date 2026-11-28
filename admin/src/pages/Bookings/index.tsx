// Bookings: list, filter, and manage rentals. Creating, extending, returning
// and cancelling all happen in modal dialogs (components/bookings).
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { apiRequest } from "../../api/client";
import { formatMK, todayBlantyre } from "../../lib/format";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Topbar from "../../components/layout/Topbar";
import Panel from "../../components/common/Panel";
import DataTable, { type Column } from "../../components/common/DataTable";
import BookingStatusBadge from "../../components/bookings/BookingStatusBadge";
import BookingRowActions from "../../components/bookings/BookingRowActions";
import NewBookingDialog, {
  type NewBookingPayload,
} from "../../components/bookings/NewBookingDialog";
import ExtendDialog, {
  type ExtendPayload,
} from "../../components/bookings/ExtendDialog";
import ReturnDialog, {
  type ReturnPayload,
} from "../../components/bookings/ReturnDialog";
import CancelDialog from "../../components/bookings/CancelDialog";
import type {
  BookingItem,
  CustomerRef,
} from "../../components/bookings/bookingTypes";

type DialogKind = "new" | "return" | "extend" | "cancel";

const STATUS_FILTERS = [
  { value: "ALL", label: "All statuses" },
  { value: "RESERVED", label: "Reserved" },
  { value: "OUT", label: "Out" },
  { value: "RETURNED", label: "Returned" },
  { value: "CANCELLED", label: "Cancelled" },
];

function customerCell(customer: CustomerRef | string) {
  if (typeof customer === "string")
    return <span className="text-slate-600">{customer}</span>;
  return (
    <div>
      <p className="font-medium">{customer.name}</p>
      <p className="text-xs text-slate-500">{customer.code}</p>
    </div>
  );
}

export default function BookingsPage() {
  const today = todayBlantyre();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [customers, setCustomers] = useState<CustomerRef[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // Which dialog is open, and for which booking (kept after closing so the
  // dialog does not go blank while it fades out).
  const [openDialog, setOpenDialog] = useState<DialogKind | null>(null);
  const [selected, setSelected] = useState<BookingItem | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query =
        statusFilter !== "ALL"
          ? `?status=${encodeURIComponent(statusFilter)}`
          : "";
      const res = await apiRequest<{ data: BookingItem[] }>(
        `/bookings${query}`,
      );
      setBookings(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Customers are only needed for the New booking form: load them once.
  useEffect(() => {
    apiRequest<{ data: CustomerRef[] }>("/customers")
      .then((res) => setCustomers(res.data || []))
      .catch(() => setError("Could not load the customer list"));
  }, []);

  function openFor(kind: DialogKind, booking: BookingItem | null = null) {
    setFeedback("");
    setSelected(booking);
    setOpenDialog(kind);
  }

  // The handlers below throw on failure: the dialog shows the message itself.
  async function createBooking(payload: NewBookingPayload) {
    const res = await apiRequest<{
      data: { booking: BookingItem; warnings?: string[] };
    }>("/bookings", {
      method: "POST",
      body: payload,
    });
    const warnings = res.data?.warnings?.length
      ? ` Warnings: ${res.data.warnings.join(", ")}.`
      : "";
    setFeedback(`Created booking ${res.data.booking.code}.${warnings}`);
    void loadBookings(); // refresh in the background so the dialog closes right away
  }

  async function extendBooking(booking: BookingItem, payload: ExtendPayload) {
    await apiRequest(`/bookings/${booking._id}/extend`, {
      method: "POST",
      body: payload,
    });
    setFeedback(
      `Extended ${booking.code} by ${payload.days} day${payload.days === 1 ? "" : "s"}.`,
    );
    void loadBookings();
  }

  async function returnBooking(booking: BookingItem, payload: ReturnPayload) {
    await apiRequest(`/bookings/${booking._id}/return`, {
      method: "POST",
      body: payload,
    });
    setFeedback(`Recorded the return for ${booking.code}.`);
    void loadBookings();
  }

  async function cancelBooking(booking: BookingItem, reason: string) {
    await apiRequest(`/bookings/${booking._id}/cancel`, {
      method: "POST",
      body: { reason },
    });
    setFeedback(`Cancelled ${booking.code}.`);
    void loadBookings();
  }

  // Pick-up needs no form: it records today's date straight away.
  async function pickUp(booking: BookingItem) {
    setFeedback("");
    setError("");
    try {
      await apiRequest(`/bookings/${booking._id}/pickup`, {
        method: "POST",
        body: { pickupDate: today },
      });
      setFeedback(`${booking.code} marked as picked up.`);
      await loadBookings();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to record the pick-up",
      );
    }
  }

  const columns: Column<BookingItem>[] = [
    {
      key: "code",
      header: "Booking",
      render: (b) => <span className="font-medium tabular-nums">{b.code}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (b) => customerCell(b.customerId),
    },
    {
      key: "dates",
      header: "Dates",
      render: (b) => (
        <span className="whitespace-nowrap tabular-nums text-slate-600">
          {b.startDate} → {b.endDate}
        </span>
      ),
    },
    {
      key: "qty",
      header: "Out / booked",
      render: (b) => (
        <span className="tabular-nums">
          <span className="font-medium">{b.qtyOut}</span>
          <span className="text-slate-500"> / {b.qty}</span>
        </span>
      ),
    },
    {
      key: "rate",
      header: "Rate",
      render: (b) => (
        <span className="whitespace-nowrap tabular-nums text-slate-600">
          {formatMK(b.ratePerChairPerDay)}/day
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (b) => (
        <BookingStatusBadge
          status={b.status}
          overdue={b.status === "OUT" && b.endDate < today}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (b) => (
        <BookingRowActions
          booking={b}
          onPickup={pickUp}
          onReturn={(x) => openFor("return", x)}
          onExtend={(x) => openFor("extend", x)}
          onCancel={(x) => openFor("cancel", x)}
        />
      ),
    },
  ];

  return (
    <div>
      <Topbar
        title="Bookings"
        subtitle="Reserve chairs, record pick-ups, extend dates and process returns."
        rightSlot={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => openFor("new")}>
              <Plus aria-hidden />
              New booking
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        {feedback && (
          <p
            role="status"
            className="flex items-start gap-2 text-sm text-green-700"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {feedback}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 text-sm text-red-600"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <Panel>
          {loading && bookings.length === 0 ? (
            <p
              role="status"
              className="py-8 text-center text-sm text-slate-500"
            >
              Loading bookings…
            </p>
          ) : (
            <DataTable
              caption="Bookings"
              columns={columns}
              rows={bookings}
              rowKey={(b) => b._id}
              emptyText="No bookings found."
            />
          )}
        </Panel>
      </div>

      <NewBookingDialog
        key={openDialog ?? "closed"}
        open={openDialog === "new"}
        onOpenChange={(o) => !o && setOpenDialog(null)}
        customers={customers}
        today={today}
        onCreate={createBooking}
      />
      <ExtendDialog
        key={openDialog ?? "closed"}
        open={openDialog === "extend"}
        onOpenChange={(o) => !o && setOpenDialog(null)}
        booking={selected}
        today={today}
        onExtend={extendBooking}
      />
      <ReturnDialog
        key={openDialog ?? "closed"}
        open={openDialog === "return"}
        onOpenChange={(o) => !o && setOpenDialog(null)}
        booking={selected}
        today={today}
        onReturn={returnBooking}
      />
      <CancelDialog
        key={openDialog ?? "closed"}
        open={openDialog === "cancel"}
        onOpenChange={(o) => !o && setOpenDialog(null)}
        booking={selected}
        onCancelBooking={cancelBooking}
      />
    </div>
  );
}
