export const DISPLAY_NAME_LIMIT = 60;
export const BIO_LIMIT = 240;

export function parseProfile(form: FormData) {
  const nameValue = form.get("display_name");
  const bioValue = form.get("bio");
  const discoverable = form.get("discoverable");

  if (typeof nameValue !== "string" || typeof bioValue !== "string") return null;
  const display_name = nameValue.trim();
  const bio = bioValue.trim();

  if (
    !display_name || [...display_name].length > DISPLAY_NAME_LIMIT ||
    [...bio].length > BIO_LIMIT || /[\p{Cc}]/u.test(display_name) ||
    /[\p{Cc}]/u.test(bio.replace(/[\r\n\t]/g, "")) ||
    (discoverable !== null && discoverable !== "on")
  ) {
    return null;
  }

  return { display_name, bio: bio || null, discoverable: discoverable === "on" };
}
