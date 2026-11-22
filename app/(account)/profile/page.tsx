import Link from "next/link";
import { requireAccount } from "../../../lib/auth/session";
import { AccountNav, AccountPanel } from "../shared";
import { ProfileEditor } from "./editor";

export const metadata = { title: "Profile | Aurevia" };

export default async function ProfilePage() {
  const account = await requireAccount("/profile");
  if (account.state === "unavailable") {
    return <AccountPanel title="Your profile" intro="Your session could not be checked."><Link className="account-link" href="/profile">Try again</Link></AccountPanel>;
  }

  const { data: profile, error } = await account.client.from("profiles")
    .select("display_name,bio,discoverable")
    .eq("user_id", account.user.id)
    .maybeSingle();

  return (
    <AccountPanel title="Your profile" intro="Your profile is visible only to you. Your account email stays separate from your profile.">
      <AccountNav current="profile" />
      <div className="account-divider">
        {error ? (
          <>
            <p role="alert">We couldn’t load your profile. Try again before making changes.</p>
            <Link className="account-link" href="/profile">Retry loading profile</Link>
          </>
        ) : (
          <>
            {profile && (
              <div className="profile-summary">
                <span className="profile-avatar" aria-hidden="true">{Array.from(profile.display_name)[0]?.toLocaleUpperCase()}</span>
                <div>
                  <h2>{profile.display_name}</h2>
                  {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                  <p>Discoverability preference: {profile.discoverable ? "Opted in" : "Off"}</p>
                </div>
              </div>
            )}
            <h2>{profile ? "Edit profile" : "Create your profile"}</h2>
            <p className="mt-2">Your avatar uses your initial.</p>
            <ProfileEditor key={account.user.id} profile={profile} />
          </>
        )}
      </div>
    </AccountPanel>
  );
}
