# Aurevia

Aurevia is an Android-first progressive web app for meeting people on the same flight. The intended experience lets verified passengers opt into discovery and decide whether to connect with each other.

Version 0.1.0 uses Next.js App Router, TypeScript, and Tailwind CSS. The home page includes a public onboarding preview and Android installation instructions. It uses the approved Aurevia artwork in `public/aurevia-project-icon.png`.

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
npm run build
npm start
```

## PWA behavior

`app/manifest.ts` supplies the standalone manifest and Android icons. Use a production build on HTTPS or localhost to exercise the service worker. For Android installation, open the site in Chrome and use **Add to Home screen**. After an online visit and service worker activation, a failed document navigation shows the offline fallback with a retry link. The service worker caches only that static fallback.

To check installation and offline behavior on an Android device, open a production build over HTTPS, install if Chrome offers it, and confirm it opens in standalone mode. Close and reopen the installed app with the device offline, then reconnect and use the retry link.

## Supabase Free

The starter runs without a Supabase project. When backend development starts, create or select a Supabase Free project, copy `.env.example` to `.env.local`, and set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` using the dashboard. The server-side configuration reader in `lib/supabase/config.ts` treats empty configuration as disabled and validates the pair. The Supabase JavaScript SDK is included for future integration. Version 0.1.0 makes no Supabase network calls and collects no passenger data. Keep secret and service-role keys on the server and outside Git.

Use server-managed verification state and row-level security to restrict discovery to verified members of the same dated flight who have opted in. Plan revocable discovery, blocking, reporting, and limited data retention before launch.

## Boarding-pass verification

The planned hybrid flow starts with a user-initiated camera permission request over HTTPS (or localhost during development). Decode the barcode on-device where practical and offer an accessible fallback when the camera or barcode is unavailable. Manual flight details alone should never confer verified status.

A copied barcode can be parsed, so verification requires a trusted validation source or review process. Send only the fields needed for the decision. Keep pass images, raw barcode contents, and booking references out of profiles, analytics, and routine logs. Use synthetic boarding passes in development.

Authentication, verification, discovery, and messaging are planned product work.
