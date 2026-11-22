import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSessionClient } from "../supabase/server";

export const readAccount = cache(async (writeCookies = false) => {
  await connection();
  const client = await createSessionClient(writeCookies);
  if (!client) return { state: "disabled" } as const;

  const { data, error } = await client.auth.getUser();
  if (error && (!error.status || error.status >= 500)) {
    return { state: "unavailable" } as const;
  }
  if (error || !data.user) return { state: "anonymous" } as const;

  return { state: "authenticated", client, user: data.user } as const;
});

export async function requireAccount(destination: "/dashboard" | "/profile") {
  const account = await readAccount();
  if (account.state === "disabled" || account.state === "anonymous") {
    redirect(`/sign-in?next=${destination}`);
  }
  return account;
}
