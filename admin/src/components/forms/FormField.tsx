import React from "react";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}

export default function FormField({
  label,
  htmlFor,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-brand-navy"
      >
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
