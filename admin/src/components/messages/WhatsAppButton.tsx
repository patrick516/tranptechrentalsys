import React from "react";

interface WhatsAppButtonProps {
  phone: string;
  message?: string;
  label?: string;
}

export default function WhatsAppButton({
  phone,
  message = "",
  label = "WhatsApp",
}: WhatsAppButtonProps) {
  const digits = String(phone || "").replace(/\D/g, "");
  const href = `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center rounded-md bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy"
    >
      {label}
    </a>
  );
}
