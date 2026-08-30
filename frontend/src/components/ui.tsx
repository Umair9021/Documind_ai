import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { SourceStatus, SourceType } from "../lib/data";
import { useRouter } from "../lib/router";

/* ---------- utils ---------- */
export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- icons (inline, 1.6 stroke) ---------- */
type IconName =
  | "logo" | "menu" | "close" | "search" | "plus" | "send" | "chevron-down" | "chevron-right"
  | "dashboard" | "library" | "flask" | "inspect" | "chart" | "settings" | "logout"
  | "doc" | "youtube" | "sparkle" | "upload" | "trash" | "dots" | "check" | "arrow-right"
  | "quote" | "layers" | "clock" | "sources" | "chat" | "back" | "retry" | "user" | "external"
  | "sun" | "moon" | "copy" | "thumb-up" | "thumb-down" | "command" | "stop" | "corner-return";

const paths: Record<IconName, ReactNode> = {
  logo: <><rect x="3" y="3" width="18" height="18" rx="5" className="fill-accent" stroke="none" /><path d="M8 8.5h5.5a3.5 3.5 0 0 1 0 7H8V8.5Z" fill="white" /><path d="M8 12h8" stroke="none" /></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  send: <path d="M6 12 4 5l16 7-16 7 2-7Zm0 0h7" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  library: <><path d="M4 5h6v14H4zM10 5h6v14h-6z" /><path d="m16 5 4 .7-2.4 13.5-3.9-.7" /></>,
  flask: <path d="M9 3h6M10 3v6l-5 8.5A2 2 0 0 0 6.7 21h10.6a2 2 0 0 0 1.7-3.5L14 9V3M7.5 15h9" />,
  inspect: <><circle cx="11" cy="11" r="6" /><path d="m20 20-3-3M11 8v6M8 11h6" /></>,
  chart: <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-7" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 15H4.4a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 6 8.3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 4.6V4.4a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 .3 1.8h.2a2 2 0 1 1 0 4h-.2Z" /></>,
  logout: <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9" />,
  doc: <><path d="M14 3v5h5" /><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M9 13h6M9 17h6" /></>,
  youtube: <><rect x="3" y="6" width="18" height="12" rx="3" /><path d="m10 9.5 5 2.5-5 2.5z" className="fill-current" stroke="none" /></>,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />,
  upload: <path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" />,
  dots: <><circle cx="5" cy="12" r="1.4" className="fill-current" stroke="none" /><circle cx="12" cy="12" r="1.4" className="fill-current" stroke="none" /><circle cx="19" cy="12" r="1.4" className="fill-current" stroke="none" /></>,
  check: <path d="m5 12 4 4 10-10" />,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  quote: <path d="M7 7h4v6a4 4 0 0 1-4 4M13 7h4v6a4 4 0 0 1-4 4" />,
  layers: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5" />,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  sources: <path d="M4 5h16M4 12h16M4 19h10" />,
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-5.2A8 8 0 1 1 21 12Z" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  retry: <path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></>,
  external: <path d="M14 5h5v5M19 5l-8 8M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>,
  "thumb-up": <path d="M7 10v10H4V10h3Zm0 0 4-7a2 2 0 0 1 2 2v3h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 18.8 20H7" />,
  "thumb-down": <path d="M17 14V4h3v10h-3Zm0 0-4 7a2 2 0 0 1-2-2v-3H6a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 7.2 4H17" />,
  command: <path d="M8 4a2 2 0 1 1-2 2v12a2 2 0 1 1 2-2h8a2 2 0 1 1 2 2V6a2 2 0 1 1-2 2H8Z" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" className="fill-current" stroke="none" />,
  "corner-return": <path d="M9 10 4 15l5 5M4 15h11a5 5 0 0 0 5-5V4" />,
};

export function ThemeToggle({ theme, toggle, variant = "icon" }: { theme: "light" | "dark"; toggle: () => void; variant?: "icon" | "full" }) {
  const isDark = theme === "dark";
  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle theme"
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground cursor-pointer"
      >
        <span className="flex items-center gap-3">
          <Icon name={isDark ? "moon" : "sun"} className="size-[18px]" />
          <span>{isDark ? "Dark mode" : "Light mode"}</span>
        </span>
        <span
          className={cx(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out",
            isDark ? "bg-accent" : "bg-border-strong"
          )}
        >
          <span
            className={cx(
              "pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out",
              isDark ? "translate-x-4" : "translate-x-0"
            )}
          />
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex size-9 items-center justify-center rounded-lg border border-border-strong bg-panel text-muted transition-colors hover:text-foreground cursor-pointer active:scale-95"
    >
      <Icon name={isDark ? "moon" : "sun"} className="size-[18px]" />
    </button>
  );
}

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {paths[name]}
    </svg>
  );
}

/* ---------- Button ---------- */
type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md";
  icon?: IconName;
  children?: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant = "primary", size = "md", icon, children, className, ...rest }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm" };
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-hover shadow-sm shadow-accent/20",
    secondary: "bg-panel text-foreground border border-border-strong hover:bg-surface",
    ghost: "text-muted hover:text-foreground hover:bg-surface",
    destructive: "bg-failed text-white hover:brightness-95",
  };
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} {...rest}>
      {icon && <Icon name={icon} className={size === "sm" ? "size-4" : "size-[18px]"} />}
      {children}
    </button>
  );
}

/* ---------- Input ---------- */
export function Input({ className, error, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={cx(
        "h-10 w-full rounded-lg border bg-panel px-3.5 text-sm text-foreground placeholder:text-faint transition-all focus:outline-none focus:ring-2 focus:ring-accent/30",
        error ? "border-failed focus:ring-failed/30" : "border-border-strong focus:border-accent",
        className,
      )}
      {...rest}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
      <Input className="pl-9" {...props} />
    </div>
  );
}

/* ---------- Badge / Status ---------- */
const statusMap: Record<SourceStatus, { label: string; cls: string; dot: string }> = {
  ready: { label: "Ready", cls: "bg-ready-soft text-ready", dot: "bg-ready" },
  processing: { label: "Processing", cls: "bg-processing-soft text-processing", dot: "bg-processing" },
  pending: { label: "Pending", cls: "bg-pending-soft text-pending", dot: "bg-pending" },
  failed: { label: "Failed", cls: "bg-failed-soft text-failed", dot: "bg-failed" },
};

export function StatusBadge({ status }: { status: SourceStatus }) {
  const s = statusMap[status];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", s.cls)}>
      <span className={cx("size-1.5 rounded-full", s.dot, status === "processing" && "animate-pulse")} />
      {s.label}
    </span>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center rounded-md bg-surface px-2 py-0.5 font-mono text-[11px] font-medium tracking-tight text-muted", className)}>{children}</span>;
}

/* ---------- Source icon ---------- */
export function SourceGlyph({ type, className = "size-9" }: { type: SourceType; className?: string }) {
  const isYt = type === "youtube";
  return (
    <div className={cx("flex shrink-0 items-center justify-center rounded-lg border", className, isYt ? "border-failed/15 bg-failed-soft text-failed" : "border-accent/15 bg-accent-soft text-accent")}>
      <Icon name={isYt ? "youtube" : "doc"} className="size-[18px]" />
    </div>
  );
}

/* ---------- Tabs (roving focus) ---------- */
export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; icon?: IconName; count?: number }[]; active: string; onChange: (id: string) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    refs.current[next]?.focus();
    onChange(tabs[next].id);
  };
  return (
    <div role="tablist" aria-label="Views" className="flex gap-1 border-b border-border">
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[i] = el; }}
          role="tab"
          aria-selected={active === t.id}
          tabIndex={active === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
          className={cx(
            "-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-panel",
            active === t.id ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground",
          )}
        >
          {t.icon && <Icon name={t.icon} className="size-4" />}
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-surface px-1.5 text-xs text-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Breadcrumbs ---------- */
export type Crumb = { label: string; to?: string };
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { navigate } = useRouter();
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px] font-medium">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {c.to && !last ? (
              <button onClick={() => navigate(c.to!)} className="rounded text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">{c.label}</button>
            ) : (
              <span className={cx("truncate", last ? "text-foreground" : "text-muted")} aria-current={last ? "page" : undefined}>{c.label}</span>
            )}
            {!last && <Icon name="chevron-right" className="size-3.5 shrink-0 text-faint" />}
          </span>
        );
      })}
    </nav>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode; footer?: ReactNode; size?: "md" | "lg" }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`dm-modal-${Math.random().toString(36).slice(2)}`).current;
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])') ?? [],
    ).filter((el) => el.offsetParent !== null);
    // move focus into the dialog on open
    const first = focusables()[0] ?? panelRef.current;
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) { e.preventDefault(); return; }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); previouslyFocused?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="dm-fade absolute inset-0 bg-foreground/25 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={cx("dm-fade-up relative w-full rounded-t-2xl border border-border bg-panel shadow-2xl shadow-foreground/10 focus:outline-none sm:rounded-2xl", size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 id={titleId} className="text-[17px] font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="-mr-1.5 rounded-lg p-1.5 text-faint transition-colors hover:bg-surface hover:text-foreground"><Icon name="close" className="size-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Confirm dialog ---------- */
export function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel = "Delete", cancelLabel = "Cancel", danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={danger ? "destructive" : "primary"} size="sm" icon={danger ? "trash" : undefined} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </Modal>
  );
}

/* ---------- Dropdown menu ---------- */
export function Menu({ items }: { items: { label: string; icon?: IconName; danger?: boolean; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-1.5 text-faint transition-colors hover:bg-surface hover:text-foreground" aria-label="Options"><Icon name="dots" className="size-5" /></button>
      {open && (
        <div className="dm-fade absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-border bg-panel py-1 shadow-xl shadow-foreground/10">
          {items.map((it) => (
            <button key={it.label} onClick={() => { it.onClick(); setOpen(false); }} className={cx("flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-surface", it.danger ? "text-failed" : "text-foreground")}>
              {it.icon && <Icon name={it.icon} className="size-4" />}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Toast ---------- */
type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; tone: "default" | "error"; action?: ToastAction };
type PushToast = (message: string, tone?: "default" | "error", action?: ToastAction) => void;
const ToastCtx = createContext<PushToast>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push: PushToast = (message, tone = "default", action) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone, action }]);
    setTimeout(() => dismiss(id), action ? 5500 : 3200);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div role="region" aria-live="polite" aria-label="Notifications" className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={cx("dm-fade-up flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-lg shadow-foreground/10", t.tone === "error" ? "border-failed/20 bg-failed-soft text-failed" : "border-border bg-foreground text-background")}>
            <Icon name={t.tone === "error" ? "close" : "check"} className="size-4 shrink-0" />
            <span>{t.message}</span>
            {t.action && (
              <button onClick={() => { t.action!.onClick(); dismiss(t.id); }} className={cx("ml-1 rounded-md px-2 py-0.5 text-[13px] font-semibold underline-offset-2 hover:underline", t.tone === "error" ? "text-failed" : "text-background")}>{t.action.label}</button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-surface", className)} />;
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon, title, description, action }: { icon: IconName; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-panel px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-surface text-muted"><Icon name={icon} className="size-6" /></div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- Section card wrapper ---------- */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-border bg-panel", className)}>{children}</div>;
}
