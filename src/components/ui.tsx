"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="FC Capital home">
      <span className="logo-mark">
        F<span>C</span>
      </span>
      <span>
        FC CAPITAL<small>A CLEARER PERSPECTIVE</small>
      </span>
    </Link>
  );
}
export function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="between">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function DemoNotice() {
  return (
    <div className="demo-notice">
      <span className="status-dot" /> PREVIEW{" "}
      <span>
        Email verification uses demo code 246810. Your documents are stored
        privately and only visible to the FC Capital review team.
      </span>
    </div>
  );
}
export const steps = [
  "Contact details",
  "Email verification",
  "Personal information",
  "Financial profile",
  "Trading experience",
  "Account preferences",
  "Documents",
  "Review & submit",
];
