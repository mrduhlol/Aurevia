export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col justify-between px-6 sm:px-12">
      <header className="py-8">
        <span className="wordmark">Aurevia</span>
      </header>

      <section className="py-16" aria-labelledby="intro">
        <h1 id="intro">Same flight.<br />New connections.</h1>
        <p className="mt-6 max-w-md">
          An upcoming space for verified passengers who choose to connect on the same flight.
        </p>
      </section>

      <footer className="site-footer py-6">
        In development
      </footer>
    </main>
  );
}
