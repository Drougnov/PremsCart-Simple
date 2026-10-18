import { useRef, useState } from "react";
import { itemPhoto } from "../api";

export function Icon({ name, size = 20 }) {
  const icons = {
    bag: "fa-bag-shopping",
    search: "fa-magnifying-glass",
    arrow: "fa-arrow-right",
    check: "fa-check",
    chat: "fa-comments",
    pin: "fa-location-dot",
    plus: "fa-plus",
    shield: "fa-shield-halved",
    edit: "fa-pen-to-square",
    camera: "fa-camera",
    clock: "fa-clock",
    user: "fa-user",
    star: "fa-star",
    book: "fa-book-open",
    laptop: "fa-laptop",
    pen: "fa-pen-ruler",
    parts: "fa-microchip",
    grid: "fa-border-all",
    close: "fa-xmark",
    chevron: "fa-chevron-right",
    refresh: "fa-rotate",
    eye: "fa-eye",
    eyeSlash: "fa-eye-slash",
    logout: "fa-arrow-right-from-bracket",
    leaf: "fa-leaf",
  };
  return (
    <i
      className={`fa-solid ${icons[name] || icons.bag}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    />
  );
}

export function Badge({ children, muted = false }) {
  return <span className={`badge ${muted ? "muted" : ""}`}>{children}</span>;
}

export function Notice({ children, success = false }) {
  if (!children) return null;
  return (
    <div
      className={`notice ${success ? "success" : ""}`}
      role={success ? "status" : "alert"}
    >
      {children}
    </div>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <Icon name="bag" size={32} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Photo({ src, alt = "", ...props }) {
  const [failedSource, setFailedSource] = useState(null);
  if (failedSource === src)
    return (
      <div
        className={`photo-fallback ${props.className || ""}`}
        role="img"
        aria-label={alt || "Photo unavailable"}
      >
        <Icon name="camera" size={28} />
        <span>Photo unavailable</span>
      </div>
    );
  return (
    <img
      {...props}
      src={itemPhoto(src)}
      alt={alt}
      onError={() => setFailedSource(src)}
    />
  );
}

export function Loading({ cards = false, label = "Loading…" }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cards ? "listing-grid skeleton-grid" : "loading-state"}
    >
      {cards ? (
        Array.from({ length: 4 }, (_, i) => (
          <div className="skeleton-card" key={i}>
            <div />
            <span />
            <span />
          </div>
        ))
      ) : (
        <>
          <span className="spinner" />
          {label}
        </>
      )}
      {cards && <span className="sr-only">{label}</span>}
    </div>
  );
}

export function PageTitle({ eyebrow, title, children, action }) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}

// The form owns its loading/error state. Individual pages only supply what to save.
export function ActionForm({
  onSubmit,
  children,
  label = "Save",
  className = "",
  successText,
  disabled = false,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current || disabled) return;
    submitting.current = true;
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await onSubmit(Object.fromEntries(new FormData(form)), form);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className={`form ${className}`}
      aria-busy={busy}
      onChange={() => {
        setSaved(false);
        setError("");
      }}
    >
      {children}
      <Notice>{error}</Notice>
      <Notice success>{saved && successText}</Notice>
      <button className="button" disabled={busy || disabled}>
        {busy ? "Please wait…" : label}
      </button>
    </form>
  );
}
