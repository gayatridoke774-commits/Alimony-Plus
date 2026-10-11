"use client";
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { X, FolderOpen, ArrowUpRight } from "lucide-react";
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <FolderOpen size={30} strokeWidth={1.4} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement as HTMLElement;
    dialog.showModal();
    return () => {
      dialog.close();
      trigger?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      onCancel={onClose}
    >
      <div className="modal-heading">
        <div>
          <p className="eyebrow">ALIMONY PLUS</p>
          <h2 id="dialog-title">{title}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <p id="dialog-description" className="muted mb-6">
        {description}
      </p>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const id = useId();
  function bind(nodes: ReactNode): ReactNode {
    return Children.map(nodes, (child) => {
      if (!isValidElement<Record<string, unknown>>(child)) return child;
      if (["input", "select", "textarea"].includes(String(child.type)))
        return cloneElement(child, {
          id,
          "aria-describedby": hint ? `${id}-hint` : undefined,
        });
      return child.props.children
        ? cloneElement(child, {}, bind(child.props.children as ReactNode))
        : child;
    });
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {bind(children)}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-link"
    >
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}
