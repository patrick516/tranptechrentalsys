import React from "react";

interface PaymentMethodBadgeProps {
  method: string;
}

export default function PaymentMethodBadge({
  method,
}: PaymentMethodBadgeProps) {
  return (
    <span className="inline-block rounded-md border border-brand-blue/30 bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold text-brand-blue">
      {method}
    </span>
  );
}
