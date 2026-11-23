import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-5 sm:px-10">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header flex flex-wrap items-center justify-between gap-x-6 py-3">
        <Link className="wordmark" href="/">Aurevia</Link>
        <nav aria-label="Main navigation" className="flex flex-wrap gap-x-5">
          <a href="#getting-started">Getting started</a>
          <a href="#install">Install</a>
          <Link href="/dashboard" prefetch={false}>Account</Link>
        </nav>
      </header>

      <main id="main" className="flex-1" tabIndex={-1}>
        <section className="hero grid items-center gap-8 py-12 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:py-20" aria-labelledby="intro">
          <div>
            <h1 id="intro">Same flight.<br />New connections.</h1>
            <p className="mt-5 max-w-md">
              Aurevia is building a place for verified passengers to meet people on their flight when they choose to be discoverable.
            </p>
            <a className="primary-link mt-7" href="#getting-started">See how it will work</a>
          </div>
          <Image
            className="hero-logo mx-auto w-full max-w-72 md:max-w-96"
            src="/aurevia-project-icon.png"
            alt=""
            width={1254}
            height={1254}
            sizes="(min-width: 768px) 384px, 288px"
          />
        </section>

        <section id="getting-started" className="section-rule py-10 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10" aria-labelledby="preview-title">
          <div>
            <h2 id="preview-title">Getting started</h2>
            <p className="mt-3 max-w-sm">A preview of the planned experience. No account or boarding pass is needed to explore this page.</p>
          </div>
          <ol className="preview-steps mt-6 md:mt-0">
            <li><strong>Verify your flight.</strong> Confirm that you’re traveling on the same flight.</li>
            <li><strong>Choose to be discoverable.</strong> Decide whether other verified passengers can find you.</li>
            <li><strong>Connect by choice.</strong> Decide who you’d like to connect with.</li>
          </ol>
        </section>

        <section id="install" className="section-rule py-10" aria-labelledby="install-title">
          <h2 id="install-title">Install on Android</h2>
          <p className="mt-3 max-w-xl">
            In Chrome, open the browser menu, choose <strong>Add to Home screen</strong>, then select <strong>Install</strong> if offered.
          </p>
        </section>
      </main>

      <footer className="site-footer py-6">Aurevia v0.3.0</footer>
    </div>
  );
}
