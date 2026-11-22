"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormResult } from "../auth/actions";
import { readAccount } from "../auth/session";
import { parseProfile } from "./validation";

export async function saveProfile(_: FormResult, form: FormData): Promise<FormResult> {
  const account = await readAccount(true);
  if (account.state === "disabled" || account.state === "anonymous") {
    redirect("/sign-in?next=/profile");
  }
  if (account.state === "unavailable") {
    return { error: "Your session could not be checked. Try again." };
  }

  const profile = parseProfile(form);
  if (!profile) {
    return { error: "Enter a display name of 1–60 characters and a bio of up to 240 characters." };
  }

  const { error } = await account.client
    .from("profiles")
    .upsert({ user_id: account.user.id, ...profile }, { onConflict: "user_id" });

  if (error) return { error: "Your profile could not be saved. Try again." };

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { notice: "Profile saved." };
}
