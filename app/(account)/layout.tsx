import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await connection();
  return (
    <div className="account-shell mx-auto flex min-h-svh max-w-6xl flex-col px-5 sm:px-10">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header flex items-center justify-between gap-4 py-3">
        <Link href="/" className="wordmark">Aurevia</Link>
        <Link href="/" className="account-link">Home</Link>
      </header>
      <main className="account-main flex-1" id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer account-footer py-6">Aurevia v0.2.0</footer>
    </div>
  );
}
