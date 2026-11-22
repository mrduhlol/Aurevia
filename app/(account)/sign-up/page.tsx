import Link from "next/link";
import { signUp } from "../../../lib/auth/actions";
import { ActionForm } from "../form";
import { AccountPanel, AvailableAuth, EmailField, PasswordField } from "../shared";

export const metadata = { title: "Create an account | Aurevia" };

export default function SignUpPage() {
  return (
    <AccountPanel title="Create an account" intro="Your email is used for sign-in and account recovery. Your profile starts private.">
      <AvailableAuth>
        <ActionForm action={signUp} submit="Create account" pendingLabel="Creating account…">
          <EmailField account />
          <PasswordField mode="new-password" />
        </ActionForm>
        <Link className="account-link" href="/sign-in">Already have an account? Sign in</Link>
      </AvailableAuth>
    </AccountPanel>
  );
}
