import Link from "next/link";
import { requestPasswordReset } from "../../../lib/auth/actions";
import { ActionForm } from "../form";
import { AccountPanel, AvailableAuth, EmailField } from "../shared";

export const metadata = { title: "Reset your password | Aurevia" };

export default function ForgotPasswordPage() {
  return (
    <AccountPanel title="Reset your password" intro="Enter your account email to request a password recovery code.">
      <AvailableAuth>
        <ActionForm action={requestPasswordReset} submit="Send recovery code" pendingLabel="Requesting code…">
          <EmailField />
        </ActionForm>
        <div className="account-links">
          <Link className="account-link" href="/reset-password">I already have a code</Link>
          <Link className="account-link" href="/sign-in">Back to sign in</Link>
        </div>
      </AvailableAuth>
    </AccountPanel>
  );
}
