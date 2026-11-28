// "Section / Current page" trail shown above a page heading.

interface BreadcrumbProps {
  section: string;
  current: string;
}

export default function Breadcrumb({ section, current }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
      <span>{section}</span>
      <span aria-hidden>/</span>
      <span aria-current="page" className="font-medium text-brand-navy">
        {current}
      </span>
    </nav>
  );
}
