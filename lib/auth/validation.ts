export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_BYTES = 72;

export function formString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validOtp(value: string) {
  return /^\d{6}$/.test(value);
}

export function validNewPassword(value: string) {
  return [...value].length >= MIN_PASSWORD_LENGTH &&
    new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES &&
    !value.includes("\0");
}

export function accountDestination(value: unknown): "/dashboard" | "/profile" {
  return value === "/profile" ? "/profile" : "/dashboard";
}
