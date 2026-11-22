import Link from "next/link";
import { resetPassword } from "../../../lib/auth/actions";
import { ActionForm } from "../form";
import { AccountPanel, AvailableAuth, CodeField, EmailField, PasswordField } from "../shared";

export const metadata = { title: "Choose a new password | Aurevia" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return (
    <AccountPanel title="Choose a new password" intro="Enter your email and the recovery code from your inbox.">
      <AvailableAuth>
        {query.sent === "1" && (
          <p className="account-notice" role="status">If there is an account for that email, a recovery code will be sent. Check your inbox and spam folder.</p>
        )}
        <ActionForm action={resetPassword} submit="Change password" pendingLabel="Changing password…">
          <EmailField />
          <CodeField />
          <PasswordField mode="new-password" />
          <PasswordField mode="new-password" confirmation />
        </ActionForm>
        <Link className="account-link" href="/forgot-password">Request another code</Link>
      </AvailableAuth>
    </AccountPanel>
  );
}
