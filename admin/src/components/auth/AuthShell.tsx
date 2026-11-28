import type { ReactNode } from "react";
import { Armchair, CreditCard, MessageSquare } from "lucide-react";

const points = [
  { icon: Armchair, text: "Bookings, returns and stock in one place" },
  { icon: CreditCard, text: "Payments, promises and a clean ledger" },
  { icon: MessageSquare, text: "WhatsApp and SMS reminders to customers" },
];

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-white font-sans text-brand-navy lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel (desktop only) */}
      <aside className="hidden flex-col items-center justify-center border-r border-slate-200 bg-slate-50 px-12 py-10 lg:flex">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <img
            src="/images/RentalsLogo.png"
            alt="TranpTech Rentals"
            className="h-32 w-auto xl:h-40"
          />
        </div>

        <div className="mt-10 w-full max-w-md text-center">
          <h2 className="text-3xl font-semibold leading-tight">
            Chair rentals, under control.
          </h2>
          <p className="mt-3 text-slate-600">
            The staff portal for running TranpTech Rentals day to day.
          </p>

          <ul className="mx-auto mt-8 inline-flex flex-col space-y-4 text-left">
            {points.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 text-sm text-slate-700"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <Icon className="h-4 w-4 text-primary" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-12 text-xs text-slate-500">Blantyre · MK Ledger</p>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <img
            src="/images/RentalsLogo.png"
            alt="TranpTech Rentals"
            className="mx-auto mb-8 h-24 w-auto lg:hidden"
          />
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && (
            <p className="mt-8 text-center text-xs text-slate-500">{footer}</p>
          )}
        </div>
      </section>
    </main>
  );
}
