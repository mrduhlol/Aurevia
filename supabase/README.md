# Supabase Free setup

Aurevia uses Supabase Auth and a single owner-only profile table. Use a dedicated test project for setup and verification. A service-role or secret key is unnecessary.

1. Create a Supabase Free project and copy its HTTPS project URL and publishable key into `.env.local`. Use the names in the repository’s `.env.example` and restart Next.js.
2. Apply [the profile migration](migrations/20261123000000_create_profiles.sql) with the Supabase SQL editor or the linked Supabase CLI. Run the migration once per database.
3. In Auth settings, enable the Email provider and **Confirm email**. Set the Auth Site URL to your actual app origin, such as `http://localhost:3000` for local development. Use HTTPS for remote environments.
4. In Auth email settings, set the OTP length to **six digits**. Customize the **Confirm signup** and **Reset password** email templates to include the one-time code. Keep link tracking disabled for auth email.

### Confirm signup template

```html
<h2>Confirm your Aurevia email</h2>
<p>Enter this code in Aurevia: <strong>{{ .Token }}</strong></p>
<p><a href="{{ .SiteURL }}/auth/confirm">Open Aurevia email confirmation</a></p>
```

### Reset password template

```html
<h2>Reset your Aurevia password</h2>
<p>Enter this code in Aurevia: <strong>{{ .Token }}</strong></p>
<p><a href="{{ .SiteURL }}/reset-password">Open Aurevia password reset</a></p>
<p>If you did not request this, you can ignore the message.</p>
```

Use the same templates for resends. Codes go in the email body and the app’s POST form. The static links contain no account information or credentials and opening them cannot consume a code.

Supabase’s default mailer is restricted and rate-limited for testing. Configure custom SMTP before sending to general users. Keep the provider’s OTP expiry and auth rate limits enabled, and set its minimum password length to 12. Review provider limits and abuse controls before public registration.

## Verify against a test project

- Confirm a synthetic account, sign out, then sign in. Reopen a protected page with an expired access token and a valid refresh token to check renewal. Repeat with an invalid session and confirm the app sends you back to sign in.
- Request a reset for a synthetic account, enter an invalid code, then use the emailed code. Verify that the old password fails and the new password works. Test an unknown email and confirm the request shows the same acknowledgement.
- Save and reopen a profile with discoverability off, then turn the preference on. Confirm a second test account cannot read or update the first account’s profile, even while the first account is opted in. Run [the policy checks](../tests/profile-rls.sql) as a database administrator against a disposable database after the migration. The script rolls back its fixture rows.
- Avatar uploads are deferred. The nullable avatar path is reserved and authenticated clients cannot write it. Aurevia displays an initial and has no public profile lookup, storage bucket, or flight verification flow.
