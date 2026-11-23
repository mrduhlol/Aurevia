"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormResult } from "../auth/actions";
import { readAccount } from "../auth/session";
import { flightClaimsEnabled } from "./config";
import { CONSENT_VERSION, parseFlightClaim, validClaimId } from "./validation";

async function flightAccount() {
  const account = await readAccount(true);
  if (account.state === "anonymous" || account.state === "disabled") {
    redirect("/sign-in?next=/flights");
  }
  return account;
}

export async function submitFlightClaim(_: FormResult, form: FormData): Promise<FormResult> {
  if (!flightClaimsEnabled()) return { error: "Flight claims are unavailable on this installation." };

  const account = await flightAccount();
  if (account.state === "unavailable") return { error: "Your session could not be checked. Try again online." };

  const claim = parseFlightClaim(form);
  if (!claim) {
    return { error: "Check the flight number, two different airport codes, the departure date, and your consent." };
  }

  const { data, error } = await account.client.rpc("submit_flight_claim", {
    p_flight_number: claim.flight_number,
    p_departure_date: claim.departure_date,
    p_origin: claim.origin,
    p_destination: claim.destination,
    p_source: claim.source,
    p_consent_version: CONSENT_VERSION,
  });

  switch (error ? null : data) {
    case "saved":
      revalidatePath("/flights");
      revalidatePath("/dashboard");
      return { notice: "Flight claim saved as unverified." };
    case "duplicate":
      return { error: "You’ve already saved this flight. Find it under Your flight claims." };
    case "limit":
      return { error: "You’ve reached the active claim limit. Delete a claim before adding another." };
    case "invalid":
      return { error: "Those flight details couldn’t be accepted. Check the fields and try again." };
    default:
      return { error: "Your flight claim could not be saved. Check your connection and try again." };
  }
}

export async function deleteFlightClaim(_: FormResult, form: FormData): Promise<FormResult> {
  if (!flightClaimsEnabled()) return { error: "Flight claims are unavailable on this installation." };

  const account = await flightAccount();
  if (account.state === "unavailable") return { error: "Your session could not be checked. Try again online." };

  const id = form.get("claim_id");
  if (!validClaimId(id)) return { error: "This flight claim could not be deleted." };

  const { error } = await account.client.from("flight_claims").delete()
    .eq("user_id", account.user.id)
    .eq("id", id);
  if (error) return { error: "Your flight claim could not be deleted. Try again." };

  revalidatePath("/flights");
  revalidatePath("/dashboard");
  return { notice: "This claim is no longer in your list." };
}
