// The action buttons on one booking row. Which ones show depends on the status.
import { Button } from "@/components/ui/button";
import type { BookingItem } from "./bookingTypes";

interface BookingRowActionsProps {
  booking: BookingItem;
  onPickup: (booking: BookingItem) => void;
  onReturn: (booking: BookingItem) => void;
  onExtend: (booking: BookingItem) => void;
  onCancel: (booking: BookingItem) => void;
}

export default function BookingRowActions({
  booking,
  onPickup,
  onReturn,
  onExtend,
  onCancel,
}: BookingRowActionsProps) {
  if (booking.status === "RESERVED") {
    return (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => onPickup(booking)}>
          Pick up
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => onCancel(booking)}
        >
          Cancel
        </Button>
      </div>
    );
  }
  if (booking.status === "OUT") {
    return (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => onReturn(booking)}>
          Return
        </Button>
        <Button size="sm" variant="outline" onClick={() => onExtend(booking)}>
          Extend
        </Button>
      </div>
    );
  }
  return null;
}
