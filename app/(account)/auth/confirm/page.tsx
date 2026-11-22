import Link from "next/link";
import { confirmEmail, resendConfirmation } from "../../../../lib/auth/actions";
import { ActionForm } from "../../form";
import { AccountPanel, AvailableAuth, CodeField, EmailField } from "../../shared";

export const metadata = { title: "Confirm your email | Aurevia" };

export default async function ConfirmEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const resend = query.resend === "1";

  return (
    <AccountPanel
      title={resend ? "Request a new code" : "Confirm your email"}
      intro={resend ? "Enter the email address you used to sign up." : "Enter the email and six-digit confirmation code from your inbox."}
    >
      <AvailableAuth>
        {!resend && query.sent === "1" && (
          <p className="account-notice" role="status">Check your inbox and spam folder for a confirmation code.</p>
        )}
        {resend ? (
          <ActionForm action={resendConfirmation} submit="Send new code" pendingLabel="Requesting code…">
            <EmailField />
          </ActionForm>
        ) : (
          <ActionForm action={confirmEmail} submit="Confirm email" pendingLabel="Confirming…">
            <EmailField />
            <CodeField />
          </ActionForm>
        )}
        <div className="account-links">
          {resend
            ? <Link className="account-link" href="/auth/confirm">I have a code</Link>
            : <Link className="account-link" href="/auth/confirm?resend=1">Request a new code</Link>}
          <Link className="account-link" href="/sign-in">Back to sign in</Link>
        </div>
      </AvailableAuth>
    </AccountPanel>
  );
}
