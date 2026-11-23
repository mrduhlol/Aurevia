import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabaseConfig } from "./lib/supabase/config";
import { sessionCookies } from "./lib/supabase/server";

export async function proxy(request: NextRequest) {
  const config = readSupabaseConfig();
  let response = NextResponse.next({ request });

  if (config) {
    const client = createServerClient(config.url, config.publishableKey, {
      cookieOptions: sessionCookies,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(changes, headers) {
          for (const { name, value } of changes) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of changes) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    });

    // Refresh cookies here. Protected reads and writes still verify the user independently.
    await client.auth.getClaims();
  }

  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export const config = {
  matcher: [
    "/sign-in", "/sign-up", "/forgot-password", "/reset-password",
    "/auth/:path*", "/dashboard/:path*", "/profile/:path*", "/flights/:path*",
  ],
};
