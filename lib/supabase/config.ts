type SupabaseConfig = Readonly<{
  url: string;
  publishableKey: string;
}>;

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.trim();
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url && !publishableKey) {
    return null;
  }

  if (!url || !publishableKey) {
    throw new Error("Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
  }

  if (URL.canParse(url) && new URL(url).protocol === "https:" && publishableKey.startsWith("sb_publishable_")) {
    return { url, publishableKey };
  }

  throw new Error("Use the HTTPS project URL and publishable key from the Supabase dashboard.");
}
