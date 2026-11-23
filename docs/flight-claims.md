# Flight claims in v0.3.0

An authenticated user can enter a flight manually or extract flight fields from supported, already decoded boarding-pass text. Both paths create **unverified** owner-only claims. The recorded entry method is an untrusted user assertion. A correctly formatted barcode can be copied or fabricated. The parser does not establish flight existence, airline issuance, passenger identity, or eligibility to travel.

## Enable on Supabase Free

1. Complete the [Supabase account setup](../supabase/README.md). Apply the [flight claims migration](../supabase/migrations/20261123000100_create_flight_claims.sql) after the profiles migration.
2. Enable the `pg_cron` extension using Supabase Cron and schedule the following job from the SQL editor as the database owner. Verify that it runs successfully in the test project before enabling claims.

   ```sql
   select cron.schedule(
     'aurevia-expired-flight-claims',
     '*/15 * * * *',
     $$delete from public.flight_claims where expires_at <= now()$$
   );
   ```

3. Set `FLIGHT_CLAIMS_ENABLED=true` in the app’s server environment and restart Next.js. The default is off. Turning the flag off hides the app workflow and blocks its actions. If you need to suspend writes through the Supabase API as well, revoke authenticated execution on the submission function in that project.

## Data and trust lifecycle

- The claim and its verification request share a row. The app stores its random ID, owner linkage, normalized flight number and airport codes, airport-local departure date, entry method, consent version, creation and expiry times, and the fixed `unverified` status. There is no review queue or approval transition in this release.
- A claim is available to its owner for 720 hours after creation. The owner can delete it earlier. RLS hides expired rows immediately. The scheduled job removes expired rows on its next run, and a new submission also clears the submitting owner’s expired rows. Provider backups may retain deleted rows according to the project’s backup policy. Deleting the account cascades to its claims.
- The format checks accept two-character IATA-style carrier designators, one to four flight digits, an optional suffix, and distinct three-letter airport codes. There is no airline or airport directory lookup. The departure date is a calendar date at the origin airport, with a server window from two days before the current UTC day through 366 days after it. A boarding-pass day number requires the user to select the year.
- The browser accepts a maximum of 512 bytes of printable ASCII from single-segment BCBP text or a local `.txt` file. It clears the source field after reading. It extracts the flight and date fields without keeping the discarded fields in application state. No file is uploaded to a server or bucket. Camera scanning, photos, PDFs, and multi-segment parsing are deferred.
- No name, booking reference, seat, barcode string, file, image, or airline token goes into a claim payload, database row, or application log. The service worker caches only the static offline page. Authenticated flight pages use private, non-cacheable responses.

## Threats and future review

- **Copied or fabricated passes.** Barcode parsing is a convenience. Both paths remain unverified, and a user cannot promote a claim. No discovery or other-user lookup uses these records.
- **Cross-account access and replay.** Server actions check the session and scope reads and deletions to the authenticated user. The database independently enforces ownership. The submission function derives the owner from the verified database identity, normalizes the trust boundary through constraints, and serializes inserts per owner. A unique flight key blocks duplicate claims across entry methods and the active limit is 20 per owner.
- **Sensitive evidence leakage.** The raw text reader sits outside the submission form. Only the selected flight fields go to server actions, and those fields are validated again. Do local testing with synthetic records. No client telemetry or third-party decoder is involved. Browser, clipboard, keyboard, and device behavior outside Aurevia remain under the user’s control.
- **Eventual corroboration.** A future integration could compare canonical flight identifiers and local departure dates with an authorized airline or schedule API on the server. Schedule corroboration would confirm that a flight is listed, with a separately named trust level. Confirming passenger eligibility would require a distinct authorized airline data source or trained review process, explicit consent, auditable reviewer privileges, and a new migration. No such provider, credentials, or review privileges are configured here.

Run `npm test`, the mock-backed production test, and [the SQL boundary tests](../tests/flight-rls.sql) against a disposable database. Use a test project to confirm the scheduled deletion job, provider API behavior, and app configuration before rollout.
