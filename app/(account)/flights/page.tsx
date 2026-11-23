import Link from "next/link";
import { requireAccount } from "../../../lib/auth/session";
import { deleteFlightClaim } from "../../../lib/flight/actions";
import { flightClaimsEnabled } from "../../../lib/flight/config";
import { flightDateBounds, MAX_ACTIVE_FLIGHT_CLAIMS } from "../../../lib/flight/validation";
import { ActionForm } from "../form";
import { AccountNav, AccountPanel } from "../shared";
import { BarcodeFlightForm, ManualFlightForm } from "./forms";

export const metadata = { title: "Flight verification | Aurevia" };

export default async function FlightsPage({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await requireAccount("/flights");
  const title = "Flight verification";
  if (account.state === "unavailable") {
    return <AccountPanel title={title} intro="Your session could not be checked.">
      <Link className="account-link" href="/flights">Try again</Link>
    </AccountPanel>;
  }
  if (!flightClaimsEnabled()) {
    return <AccountPanel title={title} intro="Flight claims are unavailable on this installation.">
      <AccountNav current="flights" />
    </AccountPanel>;
  }

  const method = (await searchParams).method;
  const bounds = flightDateBounds();
  const { data: claims, error } = await account.client.from("flight_claims")
    .select("id,flight_number,departure_date,origin,destination,source,status,expires_at")
    .eq("user_id", account.user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_ACTIVE_FLIGHT_CLAIMS);

  return (
    <AccountPanel title={title} intro="Save a private flight claim. Aurevia does not check airline records or confirm that anyone will travel.">
      <AccountNav current="flights" />
      <div className="account-divider">
        <h2>Add a flight claim</h2>
        <nav className="flight-methods" aria-label="Flight entry method">
          <Link className="account-link" href="/flights?method=barcode" aria-current={method === "barcode" ? "page" : undefined}>
            Boarding-pass barcode text
          </Link>
          <Link className="account-link" href="/flights?method=manual" aria-current={method === "manual" ? "page" : undefined}>
            Enter flight manually
          </Link>
        </nav>
        {method === "barcode" && (
          <>
            <p className="flight-method-intro">Paste an already decoded single-flight barcode or open a plain-text file. Live camera scanning, photos, and PDFs are unsupported.</p>
            <BarcodeFlightForm bounds={bounds} />
          </>
        )}
        {method === "manual" && (
          <>
            <p className="flight-method-intro">Enter the flight as printed on your itinerary. Aurevia checks the format of your entry.</p>
            <ManualFlightForm bounds={bounds} />
          </>
        )}
      </div>

      <div className="account-divider">
        <h2>Your flight claims</h2>
        <p>Saved claims remain unverified. There is no review queue in this release.</p>
        {error ? (
          <p role="alert" className="account-error mt-4">Your claims couldn’t be loaded. Check your connection and reload.</p>
        ) : claims?.length ? (
          <ul className="flight-claims">
            {claims.map((claim) => (
              <li key={claim.id}>
                <h3>{claim.flight_number} <span>{claim.origin} to {claim.destination}</span></h3>
                <p>Departs <time dateTime={claim.departure_date}>{claim.departure_date}</time></p>
                <p>Unverified. {claim.source === "manual" ? "Manual entry" : "Barcode-assisted entry"}</p>
                <p>Expires <time dateTime={claim.expires_at}>{claim.expires_at.slice(0, 10)} UTC</time></p>
                <details>
                  <summary className="account-link">Delete {claim.flight_number} claim</summary>
                  <ActionForm action={deleteFlightClaim} submit="Confirm deletion" pendingLabel="Deleting claim…" secondary>
                    <input type="hidden" name="claim_id" value={claim.id} />
                  </ActionForm>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="account-notice mt-4">You have no active flight claims.</p>
        )}
      </div>
    </AccountPanel>
  );
}
