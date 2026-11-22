# Aurevia

Aurevia is an Android-first progressive web app for meeting people on the same flight. The intended experience lets verified passengers opt into discovery and decide whether to connect with each other.

Aurevia uses Next.js App Router, TypeScript, and Tailwind CSS. The home page includes a public onboarding preview and Android installation instructions. It uses the approved Aurevia artwork in `public/aurevia-project-icon.png`.

## Local development

Use Node.js 22 or newer with npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

If the local sandbox blocks Turbopack’s worker port, run `NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack` to verify the production build.

With a production build available, run `npm run test:auth` to test the account flows against a temporary loopback HTTPS fixture. It requires OpenSSL and uses no Supabase credentials.

## PWA behavior

`app/manifest.ts` supplies the standalone manifest and Android icons. Use a production build on HTTPS or localhost to exercise the service worker. For Android installation, open the site in Chrome and use **Add to Home screen**. After an online visit and service worker activation, a failed document navigation shows the offline fallback with a retry link. The service worker caches only that static fallback.

To check installation and offline behavior on an Android device, open a production build over HTTPS, install if Chrome offers it, and confirm it opens in standalone mode. Close and reopen the installed app with the device offline, then reconnect and use the retry link.

## Accounts and profiles

Version 0.2.0 adds email/password accounts, email-code confirmation and password recovery, plus a private dashboard and profile. In the default local setup, sign-in shows that account services are unavailable until Supabase is configured.

Follow the [Supabase Free setup](supabase/README.md) to configure Auth and apply the profile migration. `lib/supabase` manages typed data access and server-side sessions. `proxy.ts` refreshes sessions and marks account responses private and non-cacheable. Browser forms use Next.js Server Actions and receive neither Supabase configuration nor session tokens. Email confirmation is required in Supabase.

Profiles have a display name, optional bio, and a discoverability preference that starts off. Postgres row-level security limits reads and writes to the owner regardless of that preference. The preference does not publish a profile, and account email is never copied into profile rows.

## Boarding-pass verification

The planned hybrid flow starts with a user-initiated camera permission request over HTTPS (or localhost during development). Decode the barcode on-device where practical and offer an accessible fallback when the camera or barcode is unavailable. Manual flight details alone should never confer verified status.

A copied barcode can be parsed, so verification requires a trusted validation source or review process. Send only the fields needed for the decision. Keep pass images, raw barcode contents, and booking references out of profiles, analytics, and routine logs. Use synthetic boarding passes in development.

Flight verification, discovery, and messaging are planned product work.
