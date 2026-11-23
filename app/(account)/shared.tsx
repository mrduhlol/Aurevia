import Link from "next/link";
import type { ReactNode } from "react";
import { readSupabaseConfig } from "../../lib/supabase/config";
import { flightClaimsEnabled } from "../../lib/flight/config";
import { signOut } from "../../lib/auth/actions";
import { ActionForm, EmailInput } from "./form";

export function AccountPanel({ title, intro, children }: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="account-panel" aria-labelledby="account-title">
      <h1 id="account-title">{title}</h1>
      <p className="account-intro">{intro}</p>
      {children}
    </section>
  );
}

export function AvailableAuth({ children }: { children: ReactNode }) {
  return readSupabaseConfig() ? children : (
    <p className="account-notice">Accounts are unavailable on this installation.</p>
  );
}

export function EmailField({ account = false }: { account?: boolean }) {
  return (
    <label className="account-field">
      Email address
      <EmailInput account={account} />
    </label>
  );
}

export function PasswordField({ mode, confirmation = false }: {
  mode: "current-password" | "new-password";
  confirmation?: boolean;
}) {
  const create = mode === "new-password";
  const describe = create && !confirmation;
  const name = confirmation ? "password_confirmation" : "password";
  return (
    <div className="account-field">
      <label htmlFor={name}>{confirmation ? "Confirm password" : "Password"}</label>
      <input
        id={name}
        type="password"
        name={name}
        autoComplete={mode}
        minLength={create ? 12 : undefined}
        maxLength={create ? 72 : 1024}
        aria-describedby={describe ? "password-hint" : undefined}
        required
      />
      {describe && <small id="password-hint">Use at least 12 characters, up to 72 UTF-8 bytes.</small>}
    </div>
  );
}

export function CodeField() {
  return (
    <label className="account-field">
      Six-digit code
      <input type="text" name="code" inputMode="numeric" autoComplete="one-time-code"
        maxLength={6} pattern="[0-9]{6}" required />
    </label>
  );
}

export function AccountNav({ current }: { current: "dashboard" | "profile" | "flights" }) {
  return (
    <nav aria-label="Account navigation" className="account-nav">
      <Link className="account-link" href="/dashboard" prefetch={false} aria-current={current === "dashboard" ? "page" : undefined}>Dashboard</Link>
      <Link className="account-link" href="/profile" prefetch={false} aria-current={current === "profile" ? "page" : undefined}>Profile</Link>
      {flightClaimsEnabled() && (
        <Link className="account-link" href="/flights" prefetch={false} aria-current={current === "flights" ? "page" : undefined}>Flights</Link>
      )}
      <ActionForm action={signOut} submit="Sign out" pendingLabel="Signing out…" secondary />
    </nav>
  );
}
