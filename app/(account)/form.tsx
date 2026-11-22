"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import type { FormResult } from "../../lib/auth/actions";

export function ActionForm({
  action,
  children,
  submit,
  pendingLabel = "Working…",
  secondary = false,
}: {
  action: (state: FormResult, form: FormData) => Promise<FormResult>;
  children?: ReactNode;
  submit: string;
  pendingLabel?: string;
  secondary?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const message = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state && "error" in state) message.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="account-form" aria-busy={pending}>
      {children}
      <button className={secondary ? "account-link" : "primary-link"} disabled={pending}>
        {pending ? pendingLabel : submit}
      </button>
      {state && "error" in state && (
        <p ref={message} role="alert" tabIndex={-1} className="account-error">{state.error}</p>
      )}
      <p role="status" className="account-status">
        {state && "notice" in state ? state.notice : ""}
      </p>
    </form>
  );
}

export function EmailInput({ account = false }: { account?: boolean }) {
  const [email, setEmail] = useState("");

  return (
    <input
      type="email"
      name="email"
      value={email}
      onChange={(event) => setEmail(event.target.value)}
      autoComplete={account ? "username" : "email"}
      autoCapitalize="none"
      spellCheck={false}
      maxLength={254}
      required
    />
  );
}
