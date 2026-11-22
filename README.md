# Aurevia

Aurevia is an Android-first progressive web app for meeting people on the same flight. The intended experience lets verified passengers opt into discovery and decide whether to connect with each other.

The starter uses Next.js App Router, TypeScript, and Tailwind CSS, with a navy-and-gold home page. Its web app manifest provides standalone display metadata and Android icon sizes. Offline support and Android installation testing are future work.

## Local development

Use Node.js 22 or newer with npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Run `npm run lint`, `npm run typecheck`, and `npm run build` to check changes.

## Supabase Free

The starter runs without a Supabase project. When backend development starts, create or select a Supabase Free project, copy `.env.example` to `.env.local`, and fill in the project URL and publishable key from the dashboard. The Supabase JavaScript SDK is included. Keep secret and service-role keys on the server and outside Git.

Use server-managed verification state and row-level security to restrict discovery to verified members of the same dated flight who have opted in. Plan revocable discovery, blocking, reporting, and limited data retention before launch.

## Boarding-pass verification

The planned hybrid flow starts with a user-initiated camera permission request over HTTPS (or localhost during development). Decode the barcode on-device where practical and offer an accessible fallback when the camera or barcode is unavailable. Manual flight details alone should never confer verified status.

A copied barcode can be parsed, so verification requires a trusted validation source or review process. Send only the fields needed for the decision. Keep pass images, raw barcode contents, and booking references out of profiles, analytics, and routine logs. Use synthetic boarding passes in development.

Authentication, verification, discovery, and messaging are planned product work.
