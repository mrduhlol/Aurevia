export type SupabaseConfig = Readonly<{
  url: string;
  publishableKey: string;
}>;

export function readSupabaseConfig(
  url = process.env.SUPABASE_URL,
  publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY,
): SupabaseConfig | null {
  const origin = url?.trim();
  const projectUrl = origin && URL.canParse(origin) ? new URL(origin) : null;
  const key = publishableKey?.trim();

  if (
    !projectUrl || projectUrl.protocol !== "https:" ||
    projectUrl.username || projectUrl.password || projectUrl.pathname !== "/" ||
    projectUrl.search || projectUrl.hash || !key ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
  ) {
    return null;
  }

  return { url: projectUrl.origin, publishableKey: key };
}
