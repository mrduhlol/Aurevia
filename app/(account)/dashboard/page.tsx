import Link from "next/link";
import { requireAccount } from "../../../lib/auth/session";
import { AccountNav, AccountPanel } from "../shared";

export const metadata = { title: "Dashboard | Aurevia" };

export default async function DashboardPage() {
  const account = await requireAccount("/dashboard");
  if (account.state === "unavailable") {
    return <AccountPanel title="Dashboard" intro="Your session could not be checked."><Link className="account-link" href="/dashboard">Try again</Link></AccountPanel>;
  }

  return (
    <AccountPanel title="Your dashboard" intro="Manage your profile and discoverability preferences.">
      <AccountNav current="dashboard" />
      <div className="account-divider">
        <h2>Your Aurevia profile</h2>
        <p>Choose your display name and what you’d like to share. Only you can see your profile in this version.</p>
        <Link className="primary-link mt-5" href="/profile" prefetch={false}>Open your profile</Link>
      </div>
    </AccountPanel>
  );
}
