"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Icon } from "./Icons";

export { Icon };

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ---------------- Toast Context & Provider ---------------- */
const ToastContext = createContext({
  toast: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = (message, type = "default", action = null) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type, action }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="dm-fade-up pointer-events-auto flex items-center gap-3 rounded-xl border border-border-strong bg-panel px-4 py-2.5 text-sm shadow-xl text-foreground"
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action.onClick();
                  setToasts((ts) => ts.filter((x) => x.id !== t.id));
                }}
                className="font-medium text-accent hover:underline"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ? ctx.toast : (msg) => alert(msg);
}

/* ---------------- Button Component ---------------- */
export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  className = "",
  onClick,
  type = "button",
  disabled = false,
  ...props
}) {
  const base = "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "h-9 px-3.5 text-xs rounded-xl gap-1.5",
    md: "h-10 px-4 text-sm rounded-xl gap-2",
    lg: "h-12 px-6 text-[15px] rounded-2xl gap-2.5",
  };

  const variants = {
    primary: "bg-accent text-white shadow-sm hover:bg-accent-hover active:scale-[0.98]",
    secondary: "border border-border bg-panel text-foreground shadow-sm hover:border-border-strong hover:bg-surface active:scale-[0.98]",
    ghost: "text-muted hover:text-foreground hover:bg-surface/70 active:scale-[0.98]",
    destructive: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 active:scale-[0.98]",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(base, sizes[size] || sizes.md, variants[variant] || variants.primary, className)}
      {...props}
    >
      {icon && iconPosition === "left" && <Icon name={icon} className="size-4 shrink-0" />}
      <span>{children}</span>
      {icon && iconPosition === "right" && <Icon name={icon} className="size-4 shrink-0" />}
    </button>
  );
}

/* ---------------- ThemeToggle ---------------- */
export function ThemeToggle({ theme, toggle, variant = "icon", className = "" }) {
  const isDark = theme === "dark";

  if (variant === "full") {
    return (
      <div className={cx("mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground", className)}>
        <div className="flex items-center gap-3">
          <Icon name={isDark ? "moon" : "sun"} className="size-[18px]" />
          <span>{isDark ? "Dark mode" : "Light mode"}</span>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle dark mode"
          className={cx(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
            isDark ? "bg-accent" : "bg-border-strong"
          )}
        >
          <span
            className={cx(
              "pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
              isDark ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className={cx(
        "flex size-9 items-center justify-center rounded-xl border border-border bg-panel text-muted transition-colors hover:border-border-strong hover:text-foreground active:scale-95",
        className
      )}
    >
      <Icon name={isDark ? "moon" : "sun"} className="size-4" />
    </button>
  );
}

/* ---------------- Form Fields ---------------- */
export function Field({ label, hint, children, error, className = "" }) {
  return (
    <div className={cx("space-y-1.5", className)}>
      {label && <label className="block text-[13px] font-medium text-foreground">{label}</label>}
      {children}
      {hint && <p className="text-xs text-muted leading-relaxed">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={cx(
        "h-10 w-full rounded-xl border border-border bg-panel px-3.5 text-sm text-foreground placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all",
        className
      )}
      {...props}
    />
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <div className={cx("relative flex items-center", className)}>
      <Icon name="search" className="absolute left-3 size-4 text-faint pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border bg-panel pl-9 pr-4 text-sm text-foreground placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
      />
    </div>
  );
}

/* ---------------- Modal Component ---------------- */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }) {
  if (!open) return null;

  const sizeClasses = {
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className={cx("dm-fade-up relative z-10 w-full rounded-2xl border border-border bg-panel p-6 shadow-2xl transition-all", sizeClasses[size] || sizeClasses.md)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-faint hover:bg-surface hover:text-foreground"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-border pt-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Context Menu (3-Dots) ---------------- */
export function Menu({ items = [] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="flex size-8 items-center justify-center rounded-lg text-faint hover:bg-surface hover:text-foreground"
        aria-label="Options"
      >
        <Icon name="dots" className="size-4" />
      </button>

      {open && (
        <div className="dm-fade-up absolute right-0 z-30 mt-1 w-36 rounded-xl border border-border bg-panel py-1.5 shadow-xl ring-1 ring-black/5">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={cx(
                "flex w-full items-center gap-2 px-3 py-1.5 text-[13px] transition-colors",
                item.danger
                  ? "text-red-500 hover:bg-red-500/10"
                  : "text-foreground hover:bg-surface"
              )}
            >
              {item.icon && <Icon name={item.icon} className="size-3.5" />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Skeletons & Empty State ---------------- */
export function Skeleton({ className = "" }) {
  return <div className={cx("animate-pulse rounded-lg bg-surface", className)} />;
}

export function EmptyState({ icon = "library", title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Icon name={icon} className="size-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ---------------- StatusBadge & SourceGlyph ---------------- */
export function StatusBadge({ status = "ready" }) {
  const config = {
    ready: { label: "Ready", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
    processing: { label: "Processing", dot: "bg-amber-500 animate-pulse", text: "text-amber-600 dark:text-amber-400" },
    pending: { label: "Pending", dot: "bg-slate-400", text: "text-muted" },
    failed: { label: "Failed", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  };
  const c = config[status] || config.ready;
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-xs font-medium", c.text)}>
      <span className={cx("size-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

export function SourceGlyph({ type = "doc", className = "size-8" }) {
  const isYt = type === "youtube";
  return (
    <div className={cx("flex shrink-0 items-center justify-center rounded-xl", isYt ? "bg-red-500/10 text-red-500" : "bg-accent-soft text-accent", className)}>
      <Icon name={isYt ? "youtube" : "doc"} className="size-4" />
    </div>
  );
}

export function Badge({ children, className = "" }) {
  return (
    <span className={cx("inline-flex items-center rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-accent", className)}>
      {children}
    </span>
  );
}

export function Breadcrumbs({ items = [] }) {
  return (
    <nav className="flex items-center gap-2 font-mono text-xs text-muted">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.to ? (
            <a href={item.to} className="hover:text-foreground transition-colors">{item.label}</a>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
          {i < items.length - 1 && <span>/</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function Tabs({ tabs = [], active, onChange }) {
  return (
    <div className="flex border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all",
            active === t.id
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          )}
        >
          {t.icon && <Icon name={t.icon} className="size-4" />}
          <span>{t.label}</span>
          {t.count !== undefined && (
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-mono text-muted">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Delete" }) {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </>
      }
    />
  );
}
