import { cn } from "@/lib/utils";

export function PageContainer({ children, className }) {
  return <div className={cn("page-container", className)}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, action, className }) {
  return (
    <header className={cn("page-header", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </header>
  );
}

export function SectionHeader({ eyebrow, title, description, action, className }) {
  return (
    <div className={cn("section-header", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <h2 className="section-heading">{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatusBadge({ children, tone = "success", className }) {
  return <span className={cn("status-badge", `status-badge-${tone}`, className)}>{children}</span>;
}

export function FilterPill({ active = false, children, className, ...props }) {
  return (
    <button
      type="button"
      className={cn("filter-pill", active && "filter-pill-active", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function CardShell({ children, className, ...props }) {
  return <div className={cn("card-shell", className)} {...props}>{children}</div>;
}

export function SearchInput({ className, ...props }) {
  return <input className={cn("search-input", className)} {...props} />;
}
