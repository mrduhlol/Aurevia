import Link from "next/link";
import { signIn } from "../../../lib/auth/actions";
import { accountDestination } from "../../../lib/auth/validation";
import { ActionForm } from "../form";
import { AccountPanel, AvailableAuth, EmailField, PasswordField } from "../shared";

export const metadata = { title: "Sign in | Aurevia" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return (
    <AccountPanel title="Sign in" intro="Open your private Aurevia account.">
      {query.reset === "1" && <p className="account-notice" role="status">Password changed. Sign in with your new password.</p>}
      <AvailableAuth>
        <ActionForm action={signIn} submit="Sign in" pendingLabel="Signing in…">
          <input type="hidden" name="next" value={accountDestination(query.next)} />
          <EmailField account />
          <PasswordField mode="current-password" />
        </ActionForm>
        <div className="account-links">
          <Link className="account-link" href="/forgot-password">Forgot password?</Link>
          <Link className="account-link" href="/auth/confirm">Confirm your email</Link>
          <Link className="account-link" href="/sign-up">Create an account</Link>
        </div>
      </AvailableAuth>
    </AccountPanel>
  );
}
