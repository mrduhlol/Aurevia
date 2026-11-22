import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { readSupabaseConfig, type SupabaseConfig } from "./config";
import type { Database } from "./database";

export const sessionCookies = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

export async function createSessionClient(writeCookies = false) {
  const config = readSupabaseConfig();
  if (!config) return null;

  const jar = await cookies();
  return createServerClient<Database>(config.url, config.publishableKey, {
    cookieOptions: sessionCookies,
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (changes) => {
        // Proxy refreshes sessions before rendering. Only actions write response cookies here.
        if (!writeCookies) return;
        for (const { name, value, options } of changes) jar.set(name, value, options);
      },
    },
  });
}

export function createIsolatedAuthClient(config: SupabaseConfig) {
  return createClient<Database>(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
