"use client";

import { useTransition } from "react";

export function ConfirmButton({
  action,
  message,
  className = "btn-danger",
  children,
}: {
  action: () => Promise<void>;
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      className={className}
      onClick={() => {
        if (window.confirm(message)) startTransition(() => action());
      }}
    >
      {children}
    </button>
  );
}
